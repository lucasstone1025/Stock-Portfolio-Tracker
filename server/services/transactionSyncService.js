import { syncTransactions } from './plaidService.js';

/**
 * Map Plaid category to system category name
 * @param {Object} transaction - Plaid transaction object
 * @returns {string} System category name
 */
function mapPlaidCategory(transaction) {
    const primaryCategory = transaction.personal_finance_category?.primary || '';
    const detailedCategory = transaction.personal_finance_category?.detailed || '';
    
    const categoryMap = {
        'FOOD_AND_DRINK': 'Food & Dining',
        'FOOD_AND_DRINK_GROCERIES': 'Groceries',
        'FOOD_AND_DRINK_RESTAURANTS': 'Food & Dining',
        'TRANSPORTATION': 'Transportation',
        'TRANSPORTATION_GAS': 'Gas & Fuel',
        'TRANSPORTATION_PUBLIC_TRANSIT': 'Transportation',
        'GENERAL_MERCHANDISE': 'Shopping',
        'ENTERTAINMENT': 'Entertainment',
        'RENT_AND_UTILITIES': 'Bills & Utilities',
        'MEDICAL': 'Health & Medical',
        'PERSONAL_CARE': 'Personal Care',
        'EDUCATION': 'Education',
        'TRAVEL': 'Travel',
        'HOME_IMPROVEMENT': 'Home',
        'INSURANCE': 'Insurance',
        'GOVERNMENT_AND_NON_PROFIT': 'Gifts & Donations',
        'INCOME': 'Income',
        'TRANSFER_IN': 'Transfer',
        'TRANSFER_OUT': 'Transfer',
        'LOAN_PAYMENTS': 'Bills & Utilities',
        'BANK_FEES': 'Fees & Charges',
    };

    // Try detailed category first, then primary
    return categoryMap[detailedCategory] || categoryMap[primaryCategory] || 'Other';
}

/**
 * Sync transactions for a specific bank account
 * @param {Object} db - Database pool
 * @param {Object} bankAccount - Bank account record from database
 * @returns {Promise<Object>} Sync results
 */
export async function syncAccountTransactions(db, bankAccount) {
    const { id: accountId, user_id: userId, access_token: encryptedToken, cursor } = bankAccount;
    
    console.log(`[TransactionSync] Starting sync for account ${accountId}, user ${userId}`);
    
    try {
        // Fetch transactions from Plaid
        const syncResult = await syncTransactions(encryptedToken, cursor);
        
        const { added, modified, removed, cursor: newCursor } = syncResult;
        
        console.log(`[TransactionSync] Received: ${added.length} added, ${modified.length} modified, ${removed.length} removed`);
        
        // Get system categories for mapping
        const categoryResult = await db.query(
            `SELECT id, name FROM budget_categories WHERE is_system = TRUE`
        );
        const categoryMap = new Map(categoryResult.rows.map(c => [c.name, c.id]));
        
        // Process added transactions
        for (const transaction of added) {
            const systemCategoryName = mapPlaidCategory(transaction);
            const categoryId = categoryMap.get(systemCategoryName) || categoryMap.get('Other');
            
            await db.query(`
                INSERT INTO transactions (
                    user_id, account_id, plaid_transaction_id, category_id,
                    amount, date, name, merchant_name, primary_category,
                    subcategory, payment_channel, pending
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (plaid_transaction_id) DO UPDATE SET
                    amount = EXCLUDED.amount,
                    name = EXCLUDED.name,
                    merchant_name = EXCLUDED.merchant_name,
                    pending = EXCLUDED.pending,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                userId,
                accountId,
                transaction.transaction_id,
                categoryId,
                -transaction.amount, // Plaid uses positive for expenses, we use negative
                transaction.date,
                transaction.name,
                transaction.merchant_name || null,
                transaction.personal_finance_category?.primary || null,
                transaction.personal_finance_category?.detailed || null,
                transaction.payment_channel || null,
                transaction.pending || false
            ]);
        }
        
        // Process modified transactions
        for (const transaction of modified) {
            await db.query(`
                UPDATE transactions SET
                    amount = $1,
                    name = $2,
                    merchant_name = $3,
                    pending = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE plaid_transaction_id = $5 AND user_id = $6
            `, [
                -transaction.amount,
                transaction.name,
                transaction.merchant_name || null,
                transaction.pending || false,
                transaction.transaction_id,
                userId
            ]);
        }
        
        // Process removed transactions
        for (const transaction of removed) {
            await db.query(`
                DELETE FROM transactions
                WHERE plaid_transaction_id = $1 AND user_id = $2
            `, [transaction.transaction_id, userId]);
        }
        
        // Update cursor for next sync
        await db.query(`
            UPDATE bank_accounts SET cursor = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [newCursor, accountId]);
        
        console.log(`[TransactionSync] Completed sync for account ${accountId}`);
        
        return {
            success: true,
            added: added.length,
            modified: modified.length,
            removed: removed.length,
            cursor: newCursor
        };
    } catch (error) {
        console.error(`[TransactionSync] Error syncing account ${accountId}:`, error.message);
        throw error;
    }
}

/**
 * Sync transactions for all active accounts of a user
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Sync results for all accounts
 */
export async function syncUserTransactions(db, userId) {
    const accountsResult = await db.query(`
        SELECT id, user_id, access_token, cursor
        FROM bank_accounts
        WHERE user_id = $1 AND is_active = TRUE
    `, [userId]);
    
    const results = [];
    
    for (const account of accountsResult.rows) {
        try {
            const result = await syncAccountTransactions(db, account);
            results.push({ accountId: account.id, ...result });
        } catch (error) {
            results.push({
                accountId: account.id,
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Sync transactions for all active accounts in the system
 * @param {Object} db - Database pool
 * @returns {Promise<Object>} Sync results summary
 */
export async function syncAllTransactions(db) {
    console.log('[TransactionSync] Starting full sync for all accounts...');
    
    const accountsResult = await db.query(`
        SELECT id, user_id, access_token, cursor
        FROM bank_accounts
        WHERE is_active = TRUE
    `);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const account of accountsResult.rows) {
        try {
            await syncAccountTransactions(db, account);
            successCount++;
            
            // Add delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`[TransactionSync] Failed to sync account ${account.id}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`[TransactionSync] Full sync complete. Success: ${successCount}, Errors: ${errorCount}`);
    
    return {
        total: accountsResult.rows.length,
        success: successCount,
        errors: errorCount
    };
}

/**
 * Add a manual transaction
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {Object} transactionData - Transaction details
 * @returns {Promise<Object>} Created transaction
 */
export async function addManualTransaction(db, userId, transactionData) {
    const { amount, date, name, categoryId, notes } = transactionData;
    
    const result = await db.query(`
        INSERT INTO transactions (
            user_id, amount, date, name, category_id, notes, is_manual
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING *
    `, [userId, amount, date, name, categoryId, notes]);
    
    return result.rows[0];
}

/**
 * Get transactions for a user with filters
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Transactions
 */
export async function getTransactions(db, userId, filters = {}) {
    const {
        startDate,
        endDate,
        categoryId,
        accountId,
        searchTerm,
        limit = 50,
        offset = 0
    } = filters;
    
    let query = `
        SELECT t.*, 
               bc.name as category_name, 
               bc.color as category_color,
               bc.icon as category_icon,
               ba.institution_name,
               ba.mask as account_mask
        FROM transactions t
        LEFT JOIN budget_categories bc ON t.category_id = bc.id
        LEFT JOIN bank_accounts ba ON t.account_id = ba.id
        WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;
    
    if (startDate) {
        query += ` AND t.date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
    }
    
    if (endDate) {
        query += ` AND t.date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
    }
    
    if (categoryId) {
        query += ` AND t.category_id = $${paramIndex}`;
        params.push(categoryId);
        paramIndex++;
    }
    
    if (accountId) {
        query += ` AND t.account_id = $${paramIndex}`;
        params.push(accountId);
        paramIndex++;
    }
    
    if (searchTerm) {
        query += ` AND (t.name ILIKE $${paramIndex} OR t.merchant_name ILIKE $${paramIndex})`;
        params.push(`%${searchTerm}%`);
        paramIndex++;
    }
    
    query += ` ORDER BY t.date DESC, t.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    return result.rows;
}

export default {
    syncAccountTransactions,
    syncUserTransactions,
    syncAllTransactions,
    addManualTransaction,
    getTransactions
};

