import 'dotenv/config';
import pg from 'pg';

const db = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    try {
        console.log('Starting budget management migration...');

        // Create bank_accounts table for Plaid-linked accounts
        await db.query(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plaid_account_id VARCHAR(255) NOT NULL,
                plaid_item_id VARCHAR(255) NOT NULL,
                institution_name VARCHAR(255),
                account_name VARCHAR(255),
                account_type VARCHAR(50),
                account_subtype VARCHAR(50),
                mask VARCHAR(10),
                access_token TEXT NOT NULL,
                cursor TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, plaid_account_id)
            );
        `);
        console.log('Created bank_accounts table.');

        // Create index on bank_accounts for faster lookups
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);
            CREATE INDEX IF NOT EXISTS idx_bank_accounts_plaid_item_id ON bank_accounts(plaid_item_id);
        `);
        console.log('Created bank_accounts indexes.');

        // Create budget_categories table
        await db.query(`
            CREATE TABLE IF NOT EXISTS budget_categories (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                parent_category_id INTEGER REFERENCES budget_categories(id) ON DELETE SET NULL,
                color VARCHAR(7) DEFAULT '#6366f1',
                icon VARCHAR(50) DEFAULT 'tag',
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created budget_categories table.');

        // Create index on budget_categories
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);
        `);
        console.log('Created budget_categories indexes.');

        // Create transactions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
                plaid_transaction_id VARCHAR(255) UNIQUE,
                category_id INTEGER REFERENCES budget_categories(id) ON DELETE SET NULL,
                amount DECIMAL(12,2) NOT NULL,
                date DATE NOT NULL,
                name VARCHAR(255) NOT NULL,
                merchant_name VARCHAR(255),
                primary_category VARCHAR(100),
                subcategory VARCHAR(100),
                payment_channel VARCHAR(50),
                pending BOOLEAN DEFAULT FALSE,
                notes TEXT,
                is_manual BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created transactions table.');

        // Create indexes on transactions
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
            CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_transactions_plaid_id ON transactions(plaid_transaction_id);
        `);
        console.log('Created transactions indexes.');

        // Create budgets table
        await db.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category_id INTEGER REFERENCES budget_categories(id) ON DELETE CASCADE,
                amount DECIMAL(12,2) NOT NULL,
                period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
                start_date DATE,
                end_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT valid_period_type CHECK (period_type IN ('weekly', 'monthly', 'yearly'))
            );
        `);
        console.log('Created budgets table.');

        // Create index on budgets
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
            CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
        `);
        console.log('Created budgets indexes.');

        // Create budget_goals table
        await db.query(`
            CREATE TABLE IF NOT EXISTS budget_goals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category_id INTEGER REFERENCES budget_categories(id) ON DELETE CASCADE,
                target_amount DECIMAL(12,2) NOT NULL,
                goal_type VARCHAR(30) NOT NULL DEFAULT 'spending_limit',
                period_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
                current_period_start DATE,
                current_period_end DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT valid_goal_type CHECK (goal_type IN ('spending_limit', 'savings_goal', 'monthly_target')),
                CONSTRAINT valid_goal_period_type CHECK (period_type IN ('weekly', 'monthly', 'yearly'))
            );
        `);
        console.log('Created budget_goals table.');

        // Create index on budget_goals
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_budget_goals_user_id ON budget_goals(user_id);
        `);
        console.log('Created budget_goals indexes.');

        // Create audit_logs table for security logging
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(50),
                resource_id VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created audit_logs table.');

        // Create index on audit_logs
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        `);
        console.log('Created audit_logs indexes.');

        // Insert system categories (these are shared across all users)
        const systemCategories = [
            { name: 'Food & Dining', color: '#ef4444', icon: 'utensils' },
            { name: 'Groceries', color: '#f97316', icon: 'shopping-cart' },
            { name: 'Transportation', color: '#eab308', icon: 'car' },
            { name: 'Gas & Fuel', color: '#84cc16', icon: 'fuel' },
            { name: 'Shopping', color: '#22c55e', icon: 'shopping-bag' },
            { name: 'Entertainment', color: '#14b8a6', icon: 'film' },
            { name: 'Bills & Utilities', color: '#06b6d4', icon: 'file-text' },
            { name: 'Health & Medical', color: '#3b82f6', icon: 'heart' },
            { name: 'Personal Care', color: '#6366f1', icon: 'user' },
            { name: 'Education', color: '#8b5cf6', icon: 'book' },
            { name: 'Travel', color: '#a855f7', icon: 'plane' },
            { name: 'Home', color: '#d946ef', icon: 'home' },
            { name: 'Insurance', color: '#ec4899', icon: 'shield' },
            { name: 'Gifts & Donations', color: '#f43f5e', icon: 'gift' },
            { name: 'Income', color: '#10b981', icon: 'dollar-sign' },
            { name: 'Transfer', color: '#6b7280', icon: 'repeat' },
            { name: 'Investments', color: '#059669', icon: 'trending-up' },
            { name: 'Fees & Charges', color: '#dc2626', icon: 'alert-circle' },
            { name: 'Other', color: '#9ca3af', icon: 'more-horizontal' }
        ];

        // Check if system categories already exist
        const existingCategories = await db.query(
            `SELECT COUNT(*) FROM budget_categories WHERE is_system = TRUE`
        );

        if (parseInt(existingCategories.rows[0].count) === 0) {
            for (const category of systemCategories) {
                await db.query(
                    `INSERT INTO budget_categories (user_id, name, color, icon, is_system)
                     VALUES (NULL, $1, $2, $3, TRUE)
                     ON CONFLICT DO NOTHING`,
                    [category.name, category.color, category.icon]
                );
            }
            console.log('Inserted system categories.');
        } else {
            console.log('System categories already exist, skipping...');
        }

        console.log('Budget management migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
        throw err;
    } finally {
        await db.end();
    }
}

migrate();

