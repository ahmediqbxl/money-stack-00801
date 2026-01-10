/**
 * Zero-Knowledge Client-Side Encryption
 * 
 * Uses Web Crypto API to encrypt/decrypt data with a key derived from user's password.
 * The encryption key is NEVER sent to the server - only the encrypted data is stored.
 * 
 * WARNING: If the user forgets their password, their data is LOST FOREVER.
 */

const SALT_PREFIX = 'moneystack_zk_';
const PBKDF2_ITERATIONS = 100000;

// Generate a key from password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a consistent salt from user ID
function generateSalt(userId: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(SALT_PREFIX + userId);
}

// Encrypt a string value
export async function encryptValue(
  value: string,
  password: string,
  userId: string
): Promise<string> {
  if (!value) return value;

  const salt = generateSalt(userId);
  const key = await deriveKey(password, salt);
  
  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(value)
  );

  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return 'ENC:' + btoa(String.fromCharCode(...combined));
}

// Decrypt an encrypted string value
export async function decryptValue(
  encryptedValue: string,
  password: string,
  userId: string
): Promise<string> {
  if (!encryptedValue || !encryptedValue.startsWith('ENC:')) {
    return encryptedValue; // Not encrypted, return as-is
  }

  try {
    const salt = generateSalt(userId);
    const key = await deriveKey(password, salt);

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedValue.slice(4)), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Check your password.');
  }
}

// Encrypt a number value (converts to string, encrypts, returns encrypted string)
export async function encryptNumber(
  value: number,
  password: string,
  userId: string
): Promise<string> {
  return encryptValue(String(value), password, userId);
}

// Decrypt a number value
export async function decryptNumber(
  encryptedValue: string,
  password: string,
  userId: string
): Promise<number> {
  const decrypted = await decryptValue(encryptedValue, password, userId);
  return parseFloat(decrypted);
}

// Encrypt a transaction object
export interface EncryptedTransaction {
  description: string;
  merchant: string | null;
  amount: string; // Encrypted as string
  category_name: string | null;
  notes: string | null;
}

export interface DecryptedTransaction {
  description: string;
  merchant: string | null;
  amount: number;
  category_name: string | null;
  notes: string | null;
}

export async function encryptTransaction(
  transaction: DecryptedTransaction,
  password: string,
  userId: string
): Promise<EncryptedTransaction> {
  const [description, merchant, amount, category_name, notes] = await Promise.all([
    encryptValue(transaction.description, password, userId),
    transaction.merchant ? encryptValue(transaction.merchant, password, userId) : null,
    encryptNumber(transaction.amount, password, userId),
    transaction.category_name ? encryptValue(transaction.category_name, password, userId) : null,
    transaction.notes ? encryptValue(transaction.notes, password, userId) : null,
  ]);

  return { description, merchant, amount, category_name, notes };
}

export async function decryptTransaction(
  transaction: EncryptedTransaction,
  password: string,
  userId: string
): Promise<DecryptedTransaction> {
  const [description, merchant, amount, category_name, notes] = await Promise.all([
    decryptValue(transaction.description, password, userId),
    transaction.merchant ? decryptValue(transaction.merchant, password, userId) : null,
    decryptNumber(transaction.amount, password, userId),
    transaction.category_name ? decryptValue(transaction.category_name, password, userId) : null,
    transaction.notes ? decryptValue(transaction.notes, password, userId) : null,
  ]);

  return { description, merchant, amount, category_name, notes };
}

// Encrypt an account object
export interface EncryptedAccount {
  bank_name: string;
  account_number: string | null;
  balance: string; // Encrypted as string
}

export interface DecryptedAccount {
  bank_name: string;
  account_number: string | null;
  balance: number;
}

export async function encryptAccount(
  account: DecryptedAccount,
  password: string,
  userId: string
): Promise<EncryptedAccount> {
  const [bank_name, account_number, balance] = await Promise.all([
    encryptValue(account.bank_name, password, userId),
    account.account_number ? encryptValue(account.account_number, password, userId) : null,
    encryptNumber(account.balance, password, userId),
  ]);

  return { bank_name, account_number, balance };
}

export async function decryptAccount(
  account: EncryptedAccount,
  password: string,
  userId: string
): Promise<DecryptedAccount> {
  const [bank_name, account_number, balance] = await Promise.all([
    decryptValue(account.bank_name, password, userId),
    account.account_number ? decryptValue(account.account_number, password, userId) : null,
    decryptNumber(account.balance, password, userId),
  ]);

  return { bank_name, account_number, balance };
}

// Utility to check if encryption key is valid by trying to decrypt a known value
export async function verifyEncryptionKey(
  testEncryptedValue: string,
  password: string,
  userId: string
): Promise<boolean> {
  try {
    await decryptValue(testEncryptedValue, password, userId);
    return true;
  } catch {
    return false;
  }
}

// Store encryption password in session storage (cleared on browser close)
// NOTE: This is a security tradeoff for UX - password is in memory during session
export function storeEncryptionPassword(password: string): void {
  sessionStorage.setItem('enc_key', password);
}

export function getStoredEncryptionPassword(): string | null {
  return sessionStorage.getItem('enc_key');
}

export function clearEncryptionPassword(): void {
  sessionStorage.removeItem('enc_key');
}

// Check if data is encrypted
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('ENC:');
}
