import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import { encrypt, decrypt, isEncryptionConfigured } from '../utils/encryption.js';

// Initialize Plaid client
const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

/**
 * Check if Plaid is properly configured
 * @returns {boolean} True if Plaid credentials are set
 */
export function isPlaidConfigured() {
    return !!(
        process.env.PLAID_CLIENT_ID &&
        process.env.PLAID_SECRET &&
        process.env.PLAID_ENV
    );
}

/**
 * Create a Link token for initializing Plaid Link
 * @param {number} userId - The user's ID
 * @param {string} clientUserId - Unique identifier for the user (string)
 * @returns {Promise<Object>} Link token response
 */
export async function createLinkToken(userId, clientUserId) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    const request = {
        user: {
            client_user_id: clientUserId.toString(),
        },
        client_name: 'TrendTracker',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
        webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    };

    try {
        const response = await plaidClient.linkTokenCreate(request);
        return response.data;
    } catch (error) {
        console.error('[Plaid] Error creating link token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Exchange a public token for an access token
 * @param {string} publicToken - The public token from Plaid Link
 * @returns {Promise<Object>} Access token and item ID
 */
export async function exchangePublicToken(publicToken) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    try {
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
        });
        
        return {
            accessToken: response.data.access_token,
            itemId: response.data.item_id,
        };
    } catch (error) {
        console.error('[Plaid] Error exchanging public token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Get accounts associated with an access token
 * @param {string} accessToken - The access token (encrypted)
 * @returns {Promise<Object>} Accounts response
 */
export async function getAccounts(encryptedAccessToken) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    const accessToken = decrypt(encryptedAccessToken);

    try {
        const response = await plaidClient.accountsGet({
            access_token: accessToken,
        });
        
        return response.data;
    } catch (error) {
        console.error('[Plaid] Error getting accounts:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Get institution details
 * @param {string} institutionId - The institution ID
 * @returns {Promise<Object>} Institution details
 */
export async function getInstitution(institutionId) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    try {
        const response = await plaidClient.institutionsGetById({
            institution_id: institutionId,
            country_codes: [CountryCode.Us],
        });
        
        return response.data.institution;
    } catch (error) {
        console.error('[Plaid] Error getting institution:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Sync transactions for an item using the sync endpoint
 * @param {string} encryptedAccessToken - The encrypted access token
 * @param {string} cursor - Optional cursor from previous sync
 * @returns {Promise<Object>} Transactions sync response
 */
export async function syncTransactions(encryptedAccessToken, cursor = null) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    const accessToken = decrypt(encryptedAccessToken);
    const allAdded = [];
    const allModified = [];
    const allRemoved = [];
    let hasMore = true;
    let nextCursor = cursor;

    try {
        while (hasMore) {
            const request = {
                access_token: accessToken,
                cursor: nextCursor,
            };

            const response = await plaidClient.transactionsSync(request);
            const data = response.data;

            allAdded.push(...data.added);
            allModified.push(...data.modified);
            allRemoved.push(...data.removed);

            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        return {
            added: allAdded,
            modified: allModified,
            removed: allRemoved,
            cursor: nextCursor,
        };
    } catch (error) {
        console.error('[Plaid] Error syncing transactions:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Remove an item (disconnect bank account)
 * @param {string} encryptedAccessToken - The encrypted access token
 * @returns {Promise<boolean>} True if successful
 */
export async function removeItem(encryptedAccessToken) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    const accessToken = decrypt(encryptedAccessToken);

    try {
        await plaidClient.itemRemove({
            access_token: accessToken,
        });
        return true;
    } catch (error) {
        console.error('[Plaid] Error removing item:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Get item details
 * @param {string} encryptedAccessToken - The encrypted access token
 * @returns {Promise<Object>} Item details
 */
export async function getItem(encryptedAccessToken) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    const accessToken = decrypt(encryptedAccessToken);

    try {
        const response = await plaidClient.itemGet({
            access_token: accessToken,
        });
        return response.data;
    } catch (error) {
        console.error('[Plaid] Error getting item:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Verify a webhook
 * @param {string} signedJwt - The Plaid-Verification header value
 * @returns {Promise<Object>} Verified webhook payload
 */
export async function verifyWebhook(signedJwt) {
    if (!isPlaidConfigured()) {
        throw new Error('Plaid is not configured');
    }

    try {
        const response = await plaidClient.webhookVerificationKeyGet({
            key_id: signedJwt.split('.')[0],
        });
        
        // In production, you should verify the JWT signature
        // using the key from response.data.key
        return response.data;
    } catch (error) {
        console.error('[Plaid] Error verifying webhook:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Encrypt an access token for storage
 * @param {string} accessToken - The plaintext access token
 * @returns {string} Encrypted access token
 */
export function encryptAccessToken(accessToken) {
    if (!isEncryptionConfigured()) {
        console.warn('[Plaid] ENCRYPTION_KEY not configured - storing token unencrypted (NOT RECOMMENDED)');
        return accessToken;
    }
    return encrypt(accessToken);
}

/**
 * Decrypt an access token for use
 * @param {string} encryptedToken - The encrypted access token
 * @returns {string} Plaintext access token
 */
export function decryptAccessToken(encryptedToken) {
    if (!isEncryptionConfigured()) {
        return encryptedToken;
    }
    return decrypt(encryptedToken);
}

export default {
    isPlaidConfigured,
    createLinkToken,
    exchangePublicToken,
    getAccounts,
    getInstitution,
    syncTransactions,
    removeItem,
    getItem,
    verifyWebhook,
    encryptAccessToken,
    decryptAccessToken,
};

