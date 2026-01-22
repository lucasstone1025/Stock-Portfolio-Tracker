/**
 * Audit Log Service
 * Provides security event logging for compliance and monitoring
 */

/**
 * Log an audit event
 * @param {Object} db - Database pool
 * @param {Object} event - Event details
 */
export async function logAuditEvent(db, event) {
    const {
        userId = null,
        action,
        resourceType = null,
        resourceId = null,
        ipAddress = null,
        userAgent = null,
        details = null
    } = event;
    
    try {
        await db.query(`
            INSERT INTO audit_logs (
                user_id, action, resource_type, resource_id,
                ip_address, user_agent, details
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            userId,
            action,
            resourceType,
            resourceId,
            ipAddress,
            userAgent,
            details ? JSON.stringify(details) : null
        ]);
    } catch (error) {
        // Don't throw - audit logging should not break the main flow
        console.error('[AuditLog] Failed to log event:', error.message);
    }
}

/**
 * Log a bank account connection event
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID
 * @param {string} institutionName - Institution name
 * @param {boolean} success - Whether the connection was successful
 */
export async function logBankConnection(db, req, userId, institutionName, success) {
    await logAuditEvent(db, {
        userId,
        action: success ? 'BANK_ACCOUNT_CONNECTED' : 'BANK_ACCOUNT_CONNECTION_FAILED',
        resourceType: 'bank_account',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
            institutionName,
            success
        }
    });
}

/**
 * Log a bank account disconnection event
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID
 * @param {number} accountId - Bank account ID
 */
export async function logBankDisconnection(db, req, userId, accountId) {
    await logAuditEvent(db, {
        userId,
        action: 'BANK_ACCOUNT_DISCONNECTED',
        resourceType: 'bank_account',
        resourceId: accountId.toString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
}

/**
 * Log an authentication failure
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {string} email - Attempted email
 * @param {string} reason - Failure reason
 */
export async function logAuthFailure(db, req, email, reason) {
    await logAuditEvent(db, {
        userId: null,
        action: 'AUTH_FAILURE',
        resourceType: 'user',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
            email: email ? email.substring(0, 3) + '***' : null, // Partially mask email
            reason
        }
    });
}

/**
 * Log a successful login
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID
 */
export async function logLogin(db, req, userId) {
    await logAuditEvent(db, {
        userId,
        action: 'LOGIN_SUCCESS',
        resourceType: 'user',
        resourceId: userId.toString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
}

/**
 * Log a logout
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID
 */
export async function logLogout(db, req, userId) {
    await logAuditEvent(db, {
        userId,
        action: 'LOGOUT',
        resourceType: 'user',
        resourceId: userId.toString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
}

/**
 * Log a webhook event
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {string} webhookType - Type of webhook
 * @param {boolean} verified - Whether the webhook was verified
 * @param {Object} details - Additional details
 */
export async function logWebhook(db, req, webhookType, verified, details = {}) {
    await logAuditEvent(db, {
        userId: null,
        action: verified ? 'WEBHOOK_RECEIVED' : 'WEBHOOK_VERIFICATION_FAILED',
        resourceType: 'webhook',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
            webhookType,
            verified,
            ...details
        }
    });
}

/**
 * Log an unauthorized access attempt
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID (if authenticated)
 * @param {string} resource - Resource attempted to access
 */
export async function logUnauthorizedAccess(db, req, userId, resource) {
    await logAuditEvent(db, {
        userId,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resourceType: resource,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
            path: req.path,
            method: req.method
        }
    });
}

/**
 * Log a transaction sync event
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {number} accountId - Bank account ID
 * @param {Object} results - Sync results
 */
export async function logTransactionSync(db, userId, accountId, results) {
    await logAuditEvent(db, {
        userId,
        action: 'TRANSACTION_SYNC',
        resourceType: 'bank_account',
        resourceId: accountId.toString(),
        details: {
            added: results.added,
            modified: results.modified,
            removed: results.removed,
            success: results.success
        }
    });
}

/**
 * Log a sensitive data access
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID
 * @param {string} dataType - Type of data accessed
 */
export async function logSensitiveDataAccess(db, req, userId, dataType) {
    await logAuditEvent(db, {
        userId,
        action: 'SENSITIVE_DATA_ACCESS',
        resourceType: dataType,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
}

/**
 * Log account deletion
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID
 */
export async function logAccountDeletion(db, req, userId) {
    await logAuditEvent(db, {
        userId,
        action: 'ACCOUNT_DELETED',
        resourceType: 'user',
        resourceId: userId.toString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
}

/**
 * Get audit logs for a user
 * @param {Object} db - Database pool
 * @param {number} userId - User ID (null for all users - admin only)
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Audit logs
 */
export async function getAuditLogs(db, userId = null, filters = {}) {
    const {
        action = null,
        startDate = null,
        endDate = null,
        limit = 100,
        offset = 0
    } = filters;
    
    let query = `
        SELECT * FROM audit_logs
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
    }
    
    if (action) {
        query += ` AND action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
    }
    
    if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
    }
    
    if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    return result.rows;
}

/**
 * Get the count of manual syncs a user has performed today
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of syncs today
 */
export async function getTodaySyncCount(db, userId) {
    const result = await db.query(`
        SELECT COUNT(*) as count FROM audit_logs
        WHERE user_id = $1
        AND action = 'MANUAL_SYNC'
        AND created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `, [userId]);
    return parseInt(result.rows[0].count) || 0;
}

/**
 * Check if user can perform a manual sync
 * @param {Object} db - Database pool
 * @param {number} userId - User ID
 * @param {number} dailyLimit - Maximum syncs per day (default 3)
 * @returns {Promise<Object>} { canSync, remaining, used }
 */
export async function checkSyncLimit(db, userId, dailyLimit = 3) {
    const used = await getTodaySyncCount(db, userId);
    const remaining = Math.max(0, dailyLimit - used);
    return {
        canSync: used < dailyLimit,
        remaining,
        used,
        dailyLimit
    };
}

/**
 * Log a manual sync event (user-initiated)
 * @param {Object} db - Database pool
 * @param {Object} req - Express request object
 * @param {number} userId - User ID
 */
export async function logManualSync(db, req, userId) {
    await logAuditEvent(db, {
        userId,
        action: 'MANUAL_SYNC',
        resourceType: 'transaction_sync',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });
}

export default {
    logAuditEvent,
    logBankConnection,
    logBankDisconnection,
    logAuthFailure,
    logLogin,
    logLogout,
    logWebhook,
    logUnauthorizedAccess,
    logTransactionSync,
    logSensitiveDataAccess,
    logAccountDeletion,
    getAuditLogs,
    getTodaySyncCount,
    checkSyncLimit,
    logManualSync
};

