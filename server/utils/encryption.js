import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

/**
 * Derives an encryption key from the master key using PBKDF2
 * @param {string} masterKey - The master encryption key from environment
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived key
 */
function deriveKey(masterKey, salt) {
    return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts plaintext using AES-256-GCM
 * @param {string} plaintext - The text to encrypt
 * @returns {string} Encrypted text as base64 string (salt:iv:authTag:ciphertext)
 */
export function encrypt(plaintext) {
    const masterKey = process.env.ENCRYPTION_KEY;
    
    if (!masterKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    if (!plaintext) {
        throw new Error('Plaintext is required for encryption');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from master key
    const key = deriveKey(masterKey, salt);
    
    // Create cipher and encrypt
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag for integrity verification
    const authTag = cipher.getAuthTag();
    
    // Combine salt, IV, auth tag, and ciphertext
    const combined = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
}

/**
 * Decrypts ciphertext using AES-256-GCM
 * @param {string} encryptedData - The encrypted text as base64 string
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedData) {
    const masterKey = process.env.ENCRYPTION_KEY;
    
    if (!masterKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    if (!encryptedData) {
        throw new Error('Encrypted data is required for decryption');
    }

    try {
        // Decode from base64
        const combined = Buffer.from(encryptedData, 'base64');
        
        // Extract components
        const salt = combined.subarray(0, SALT_LENGTH);
        const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const authTag = combined.subarray(
            SALT_LENGTH + IV_LENGTH,
            SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
        );
        const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
        
        // Derive key from master key
        const key = deriveKey(masterKey, salt);
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt
        let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed: Invalid or corrupted data');
    }
}

/**
 * Generates a random encryption key suitable for ENCRYPTION_KEY env variable
 * @returns {string} A 32-byte hex string suitable for AES-256
 */
export function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies that the encryption key is properly configured
 * @returns {boolean} True if encryption key is valid
 */
export function isEncryptionConfigured() {
    const key = process.env.ENCRYPTION_KEY;
    return key && key.length >= 32;
}

export default {
    encrypt,
    decrypt,
    generateEncryptionKey,
    isEncryptionConfigured
};

