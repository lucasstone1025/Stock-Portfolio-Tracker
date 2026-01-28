import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Helmet security headers middleware
 */
export const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.plaid.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: [
                "'self'",
                "https://cdn.plaid.com",
                "https://production.plaid.com",
                "https://sandbox.plaid.com",
                "https://development.plaid.com",
                "https://finnhub.io"
            ],
            frameSrc: ["'self'", "https://cdn.plaid.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: isProduction ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false, // Required for Plaid Link
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Required for Plaid
});

/**
 * General API rate limiter
 */
export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !isProduction && req.ip === '127.0.0.1',
});

/**
 * Authentication rate limiter (stricter)
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: { error: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

/**
 * Plaid endpoints rate limiter
 */
export const plaidLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: { error: 'Too many requests to banking services, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Transaction sync rate limiter
 */
export const syncLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 1 day
    max: 3, // 3 syncs per day per IP
    message: { error: 'Please wait before syncing again. Sync is limited to 3 per day.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Phone verification (SMS) rate limiter
 */
export const phoneVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 codes per 15 minutes per IP
    message: { error: 'Too many verification attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Validation error handler middleware
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const details = errors.array().map(err => ({ field: err.path, message: err.msg }));
        const first = details[0]?.message;
        return res.status(400).json({
            error: first || 'Validation failed',
            details
        });
    }
    next();
};

/**
 * Common validation rules
 */
export const validators = {
    // Budget validators
    createBudget: [
        body('categoryId').isInt({ min: 1 }).withMessage('Valid category ID is required'),
        body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
        body('periodType')
            .isIn(['weekly', 'monthly', 'yearly'])
            .withMessage('Period type must be weekly, monthly, or yearly'),
    ],
    
    updateBudget: [
        param('id').isInt({ min: 1 }).withMessage('Valid budget ID is required'),
        body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
        body('periodType')
            .optional()
            .isIn(['weekly', 'monthly', 'yearly'])
            .withMessage('Period type must be weekly, monthly, or yearly'),
    ],
    
    // Transaction validators
    createTransaction: [
        body('amount').isFloat().withMessage('Amount is required'),
        body('date').isISO8601().toDate().withMessage('Valid date is required'),
        body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required (max 255 chars)'),
        body('categoryId').optional().isInt({ min: 1 }).withMessage('Valid category ID is required'),
        body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes max 1000 chars'),
    ],
    
    updateTransactionCategory: [
        param('id').isInt({ min: 1 }).withMessage('Valid transaction ID is required'),
        body('categoryId').isInt({ min: 1 }).withMessage('Valid category ID is required'),
    ],
    
    // Category validators
    createCategory: [
        body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 chars)'),
        body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be valid hex'),
        body('icon').optional().trim().isLength({ max: 50 }).withMessage('Icon max 50 chars'),
    ],
    
    // Goal validators
    createGoal: [
        body('categoryId').optional().isInt({ min: 1 }).withMessage('Valid category ID is required'),
        body('targetAmount').isFloat({ min: 0.01 }).withMessage('Target amount must be positive'),
        body('goalType')
            .isIn(['spending_limit', 'savings_goal', 'monthly_target'])
            .withMessage('Invalid goal type'),
        body('periodType')
            .isIn(['weekly', 'monthly', 'yearly'])
            .withMessage('Period type must be weekly, monthly, or yearly'),
    ],
    
    // Query validators
    transactionFilters: [
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date'),
        query('categoryId').optional().isInt({ min: 1 }).withMessage('Invalid category ID'),
        query('accountId').optional().isInt({ min: 1 }).withMessage('Invalid account ID'),
        query('search').optional().trim().isLength({ max: 200 }).withMessage('Search max 200 chars'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
        query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    ],
    
    // ID parameter validator
    idParam: [
        param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
    ],
    
    // Symbol parameter validator
    symbolParam: [
        param('symbol').trim().isLength({ min: 1, max: 10 }).matches(/^[A-Za-z0-9.\-]+$/).withMessage('Valid symbol is required'),
    ],

    register: [
        body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters'),
        body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required (max 100 chars)'),
        body('phone').optional({ values: 'null' }).trim().isLength({ max: 20 }).withMessage('Phone max 20 chars'),
    ],

    watchlistAdd: [
        body('symbol').trim().isLength({ min: 1, max: 10 }).matches(/^[A-Za-z0-9.\-]+$/).withMessage('Valid symbol is required'),
        body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
        body('dayhigh').isFloat({ min: 0 }).withMessage('Valid day high is required'),
        body('daylow').isFloat({ min: 0 }).withMessage('Valid day low is required'),
        body('companyname').optional().trim().isLength({ max: 255 }).withMessage('Company name max 255 chars'),
        body('marketcap').optional().isFloat({ min: 0 }).withMessage('Market cap must be non-negative'),
        body('sector').optional().trim().isLength({ max: 100 }).withMessage('Sector max 100 chars'),
    ],

    alertCreate: [
        body('symbol').trim().isLength({ min: 1, max: 10 }).matches(/^[A-Za-z0-9.\-]+$/).withMessage('Valid symbol is required'),
        body('direction').isIn(['up', 'down']).withMessage('Direction must be up or down'),
        body('target_price').isFloat({ min: 0.0001 }).withMessage('Target price must be a positive number'),
        body('alert_method').optional().isIn(['email', 'sms', 'both']).withMessage('Alert method must be email, sms, or both'),
    ],

    alertDelete: [
        body('alert_id').isInt({ min: 1 }).withMessage('Valid alert ID is required'),
    ],

    watchlistDelete: [
        body('symbol').trim().isLength({ min: 1, max: 10 }).matches(/^[A-Za-z0-9.\-]+$/).withMessage('Valid symbol is required'),
    ],

    searchSuggest: [
        query('q').optional().trim().isLength({ max: 100 }).withMessage('Query max 100 chars'),
    ],

    bulkCategory: [
        body('transactionIds').isArray({ min: 1 }).withMessage('transactionIds must be a non-empty array'),
        body('categoryId').isInt({ min: 1 }).withMessage('Valid category ID is required'),
    ],
};

/**
 * Authorization middleware - verify user owns the resource
 */
export function createAuthorizationMiddleware(db) {
    return {
        /**
         * Verify user owns the bank account
         */
        ownsBankAccount: async (req, res, next) => {
            const accountId = req.params.id || req.body.accountId;
            if (!accountId) return next();
            
            try {
                const result = await db.query(
                    'SELECT user_id FROM bank_accounts WHERE id = $1',
                    [accountId]
                );
                
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Bank account not found' });
                }
                
                if (result.rows[0].user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                next();
            } catch (err) {
                console.error('Authorization check failed:', err);
                res.status(500).json({ error: 'Authorization check failed' });
            }
        },
        
        /**
         * Verify user owns the transaction
         */
        ownsTransaction: async (req, res, next) => {
            const transactionId = req.params.id;
            if (!transactionId) return next();
            
            try {
                const result = await db.query(
                    'SELECT user_id FROM transactions WHERE id = $1',
                    [transactionId]
                );
                
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Transaction not found' });
                }
                
                if (result.rows[0].user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                next();
            } catch (err) {
                console.error('Authorization check failed:', err);
                res.status(500).json({ error: 'Authorization check failed' });
            }
        },
        
        /**
         * Verify user owns the budget
         */
        ownsBudget: async (req, res, next) => {
            const budgetId = req.params.id;
            if (!budgetId) return next();
            
            try {
                const result = await db.query(
                    'SELECT user_id FROM budgets WHERE id = $1',
                    [budgetId]
                );
                
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Budget not found' });
                }
                
                if (result.rows[0].user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                next();
            } catch (err) {
                console.error('Authorization check failed:', err);
                res.status(500).json({ error: 'Authorization check failed' });
            }
        },
        
        /**
         * Verify user owns the budget goal
         */
        ownsGoal: async (req, res, next) => {
            const goalId = req.params.id;
            if (!goalId) return next();
            
            try {
                const result = await db.query(
                    'SELECT user_id FROM budget_goals WHERE id = $1',
                    [goalId]
                );
                
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Goal not found' });
                }
                
                if (result.rows[0].user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                next();
            } catch (err) {
                console.error('Authorization check failed:', err);
                res.status(500).json({ error: 'Authorization check failed' });
            }
        },
        
        /**
         * Verify user owns the category (or it's a system category)
         */
        canAccessCategory: async (req, res, next) => {
            const categoryId = req.params.id || req.body.categoryId;
            if (!categoryId) return next();
            
            try {
                const result = await db.query(
                    'SELECT user_id, is_system FROM budget_categories WHERE id = $1',
                    [categoryId]
                );
                
                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Category not found' });
                }
                
                const category = result.rows[0];
                if (!category.is_system && category.user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }
                
                next();
            } catch (err) {
                console.error('Authorization check failed:', err);
                res.status(500).json({ error: 'Authorization check failed' });
            }
        },
    };
}

export default {
    helmetMiddleware,
    generalLimiter,
    authLimiter,
    plaidLimiter,
    syncLimiter,
    phoneVerifyLimiter,
    handleValidationErrors,
    validators,
    createAuthorizationMiddleware,
};

