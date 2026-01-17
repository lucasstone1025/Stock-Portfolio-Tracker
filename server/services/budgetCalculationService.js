/**
 * Calculate the start and end dates for a budget period
 * @param {string} periodType - 'weekly', 'monthly', or 'yearly'
 * @param {Date} referenceDate - Reference date (defaults to today)
 * @returns {Object} { startDate, endDate }
 */
export function getPeriodDates(periodType, referenceDate = new Date()) {
    const date = new Date(referenceDate);
    let startDate, endDate;
    
    switch (periodType) {
        case 'weekly':
            // Start of week (Sunday)
            const dayOfWeek = date.getDay();
            startDate = new Date(date);
            startDate.setDate(date.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'monthly':
            startDate = new Date(date.getFullYear(), date.getMonth(), 1);
            endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        case 'yearly':
            startDate = new Date(date.getFullYear(), 0, 1);
            endDate = new Date(date.getFullYear(), 11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;
            
        default:
            throw new Error(`Invalid period type: ${periodType}`);
    }
    
    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

/**
 * Calculate spending for a category within a date range
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {number} categoryId - Category ID (null for all categories)
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<number>} Total spending (positive number)
 */
export async function calculateSpending(db, userId, categoryId, startDate, endDate) {
    let query = `
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM transactions
        WHERE user_id = $1
          AND date >= $2
          AND date <= $3
          AND amount < 0
    `;
    const params = [userId, startDate, endDate];
    
    if (categoryId) {
        query += ` AND category_id = $4`;
        params.push(categoryId);
    }
    
    const result = await db.query(query, params);
    return parseFloat(result.rows[0].total) || 0;
}

/**
 * Calculate income for a user within a date range
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<number>} Total income
 */
export async function calculateIncome(db, userId, startDate, endDate) {
    const result = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = $1
          AND date >= $2
          AND date <= $3
          AND amount > 0
    `, [userId, startDate, endDate]);
    
    return parseFloat(result.rows[0].total) || 0;
}

/**
 * Get budget summary for a user
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {string} periodType - 'weekly', 'monthly', or 'yearly'
 * @returns {Promise<Object>} Budget summary with categories
 */
export async function getBudgetSummary(db, userId, periodType = 'monthly') {
    const { startDate, endDate } = getPeriodDates(periodType);
    
    // Get all budgets for the user
    const budgetsResult = await db.query(`
        SELECT b.*, bc.name as category_name, bc.color as category_color, bc.icon as category_icon
        FROM budgets b
        JOIN budget_categories bc ON b.category_id = bc.id
        WHERE b.user_id = $1 AND b.is_active = TRUE AND b.period_type = $2
    `, [userId, periodType]);
    
    const categories = [];
    let totalBudget = 0;
    let totalSpent = 0;
    
    for (const budget of budgetsResult.rows) {
        const spent = await calculateSpending(db, userId, budget.category_id, startDate, endDate);
        const remaining = budget.amount - spent;
        const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
        
        categories.push({
            id: budget.id,
            categoryId: budget.category_id,
            categoryName: budget.category_name,
            categoryColor: budget.category_color,
            categoryIcon: budget.category_icon,
            budgetAmount: parseFloat(budget.amount),
            spent,
            remaining,
            percentUsed: Math.min(percentUsed, 100),
            isOverBudget: spent > budget.amount
        });
        
        totalBudget += parseFloat(budget.amount);
        totalSpent += spent;
    }
    
    // Get uncategorized spending
    const uncategorizedResult = await db.query(`
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM transactions
        WHERE user_id = $1
          AND date >= $2
          AND date <= $3
          AND amount < 0
          AND category_id IS NULL
    `, [userId, startDate, endDate]);
    
    const uncategorizedSpent = parseFloat(uncategorizedResult.rows[0].total) || 0;
    
    // Calculate income
    const income = await calculateIncome(db, userId, startDate, endDate);
    
    return {
        periodType,
        startDate,
        endDate,
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        percentUsed: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        income,
        netSavings: income - totalSpent - uncategorizedSpent,
        uncategorizedSpent,
        categories
    };
}

/**
 * Get spending by category for a period
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Array>} Spending by category
 */
export async function getSpendingByCategory(db, userId, startDate, endDate) {
    const result = await db.query(`
        SELECT 
            bc.id,
            bc.name,
            bc.color,
            bc.icon,
            COALESCE(SUM(ABS(t.amount)), 0) as total
        FROM budget_categories bc
        LEFT JOIN transactions t ON t.category_id = bc.id 
            AND t.user_id = $1 
            AND t.date >= $2 
            AND t.date <= $3
            AND t.amount < 0
        WHERE bc.is_system = TRUE OR bc.user_id = $1
        GROUP BY bc.id, bc.name, bc.color, bc.icon
        HAVING COALESCE(SUM(ABS(t.amount)), 0) > 0
        ORDER BY total DESC
    `, [userId, startDate, endDate]);
    
    return result.rows.map(row => ({
        ...row,
        total: parseFloat(row.total)
    }));
}

/**
 * Get spending trends over time
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {number} months - Number of months to look back
 * @returns {Promise<Array>} Monthly spending totals
 */
export async function getSpendingTrends(db, userId, months = 6) {
    const result = await db.query(`
        SELECT 
            DATE_TRUNC('month', date) as month,
            COALESCE(SUM(ABS(amount)), 0) as spending,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income
        FROM transactions
        WHERE user_id = $1
          AND date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${months - 1} months'
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month ASC
    `, [userId]);
    
    return result.rows.map(row => ({
        month: row.month,
        spending: parseFloat(row.spending),
        income: parseFloat(row.income)
    }));
}

/**
 * Get budget goal progress
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Goal progress
 */
export async function getBudgetGoalProgress(db, userId) {
    const goalsResult = await db.query(`
        SELECT bg.*, bc.name as category_name, bc.color as category_color
        FROM budget_goals bg
        LEFT JOIN budget_categories bc ON bg.category_id = bc.id
        WHERE bg.user_id = $1 AND bg.is_active = TRUE
    `, [userId]);
    
    const goals = [];
    
    for (const goal of goalsResult.rows) {
        const { startDate, endDate } = getPeriodDates(goal.period_type);
        const spent = await calculateSpending(db, userId, goal.category_id, startDate, endDate);
        
        let progress, status;
        
        if (goal.goal_type === 'spending_limit') {
            progress = goal.target_amount > 0 ? (spent / goal.target_amount) * 100 : 0;
            status = spent > goal.target_amount ? 'exceeded' : 
                     progress >= 80 ? 'warning' : 'on_track';
        } else if (goal.goal_type === 'savings_goal') {
            const income = await calculateIncome(db, userId, startDate, endDate);
            const saved = income - spent;
            progress = goal.target_amount > 0 ? (saved / goal.target_amount) * 100 : 0;
            status = saved >= goal.target_amount ? 'achieved' :
                     progress >= 50 ? 'on_track' : 'behind';
        } else {
            progress = goal.target_amount > 0 ? (spent / goal.target_amount) * 100 : 0;
            status = progress >= 100 ? 'achieved' : 'in_progress';
        }
        
        goals.push({
            id: goal.id,
            categoryId: goal.category_id,
            categoryName: goal.category_name || 'Overall',
            categoryColor: goal.category_color,
            goalType: goal.goal_type,
            periodType: goal.period_type,
            targetAmount: parseFloat(goal.target_amount),
            currentAmount: spent,
            progress: Math.min(progress, 100),
            status,
            startDate,
            endDate
        });
    }
    
    return goals;
}

/**
 * Check if any budgets are over or near limit
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Budgets that need attention
 */
export async function checkBudgetAlerts(db, userId) {
    const summary = await getBudgetSummary(db, userId, 'monthly');
    
    const alerts = [];
    
    for (const category of summary.categories) {
        if (category.isOverBudget) {
            alerts.push({
                type: 'over_budget',
                categoryName: category.categoryName,
                budgetAmount: category.budgetAmount,
                spent: category.spent,
                percentOver: ((category.spent - category.budgetAmount) / category.budgetAmount) * 100
            });
        } else if (category.percentUsed >= 80) {
            alerts.push({
                type: 'approaching_limit',
                categoryName: category.categoryName,
                budgetAmount: category.budgetAmount,
                spent: category.spent,
                percentUsed: category.percentUsed
            });
        }
    }
    
    return alerts;
}

export default {
    getPeriodDates,
    calculateSpending,
    calculateIncome,
    getBudgetSummary,
    getSpendingByCategory,
    getSpendingTrends,
    getBudgetGoalProgress,
    checkBudgetAlerts
};

