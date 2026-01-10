/**
 * Hook for handling encrypted database operations
 * Wraps the database service with encryption/decryption logic
 */

import { useState, useCallback, useEffect } from 'react';
import { databaseService, DatabaseAccount, DatabaseTransaction } from '@/services/databaseService';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getStoredEncryptionPassword, 
  encryptValue, 
  decryptValue,
  encryptNumber,
  decryptNumber,
  isEncrypted 
} from '@/lib/encryption';
import { useToast } from './use-toast';

// Encrypted versions stored in DB (amounts as encrypted strings)
interface EncryptedAccountRecord {
  id: string;
  external_account_id: string;
  bank_name: string; // encrypted
  account_type: string;
  account_number: string; // encrypted
  balance: number; // Will be stored as 0, real balance encrypted in bank_name field as JSON
  currency: string;
  provider: 'plaid' | 'flinks';
  connected_at: string;
  last_synced_at: string;
  is_active: boolean;
}

interface EncryptedTransactionRecord {
  id: string;
  account_id: string;
  external_transaction_id: string;
  description: string; // encrypted
  amount: number; // Will be stored as 0, real amount encrypted
  date: string;
  merchant?: string; // encrypted
  category_name?: string; // encrypted
  is_manual_category: boolean;
  notes?: string | null; // encrypted
}

// Decrypted versions for display
export interface DecryptedAccount extends DatabaseAccount {}
export interface DecryptedTransaction extends DatabaseTransaction {}

export const useEncryptedDatabase = () => {
  const [accounts, setAccounts] = useState<DecryptedAccount[]>([]);
  const [transactions, setTransactions] = useState<DecryptedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const getPassword = useCallback(() => {
    const password = getStoredEncryptionPassword();
    if (!password) {
      setEncryptionError('Encryption key not found. Please sign in again.');
      return null;
    }
    return password;
  }, []);

  // Decrypt a single account
  const decryptAccount = useCallback(async (
    account: DatabaseAccount, 
    password: string, 
    userId: string
  ): Promise<DecryptedAccount> => {
    try {
      // Check if data is encrypted
      if (isEncrypted(account.bank_name)) {
        const [bank_name, account_number, balanceStr] = await Promise.all([
          decryptValue(account.bank_name, password, userId),
          account.account_number ? decryptValue(account.account_number, password, userId) : null,
          // Balance is stored encrypted in a special way - check if we have encrypted balance
          Promise.resolve(account.balance), // For now, balance might not be encrypted yet
        ]);

        // Try to decrypt balance if it's stored as encrypted string in notes or similar
        let balance = account.balance;
        
        return {
          ...account,
          bank_name,
          account_number: account_number || account.account_number,
          balance,
        };
      }
      
      // Not encrypted, return as-is (legacy data)
      return account;
    } catch (error) {
      console.error('Failed to decrypt account:', error);
      throw error;
    }
  }, []);

  // Decrypt a single transaction
  const decryptTransaction = useCallback(async (
    transaction: DatabaseTransaction,
    password: string,
    userId: string
  ): Promise<DecryptedTransaction> => {
    try {
      if (isEncrypted(transaction.description)) {
        const [description, merchant, category_name, notes, amountStr] = await Promise.all([
          decryptValue(transaction.description, password, userId),
          transaction.merchant ? decryptValue(transaction.merchant, password, userId) : null,
          transaction.category_name ? decryptValue(transaction.category_name, password, userId) : null,
          transaction.notes ? decryptValue(transaction.notes, password, userId) : null,
          // Amount might be encrypted as part of description JSON
          Promise.resolve(String(transaction.amount)),
        ]);

        return {
          ...transaction,
          description,
          merchant: merchant || undefined,
          category_name: category_name || undefined,
          notes,
          // For now, amount stays as stored (we'll encrypt it properly below)
        };
      }
      
      // Not encrypted, return as-is
      return transaction;
    } catch (error) {
      console.error('Failed to decrypt transaction:', error);
      throw error;
    }
  }, []);

  // Encrypt account data before saving
  const encryptAccountData = useCallback(async (
    account: Omit<DatabaseAccount, 'id'>,
    password: string,
    userId: string
  ): Promise<Omit<DatabaseAccount, 'id'>> => {
    const [bank_name, account_number] = await Promise.all([
      encryptValue(account.bank_name, password, userId),
      account.account_number ? encryptValue(account.account_number, password, userId) : null,
    ]);

    // Store encrypted balance as part of bank_name JSON
    const encryptedBalance = await encryptNumber(account.balance, password, userId);
    const encryptedBankName = await encryptValue(
      JSON.stringify({ name: account.bank_name, balance: account.balance }),
      password,
      userId
    );

    return {
      ...account,
      bank_name: encryptedBankName,
      account_number: account_number || account.account_number,
      balance: 0, // Store 0 in DB, real balance is encrypted in bank_name
    };
  }, []);

  // Encrypt transaction data before saving
  const encryptTransactionData = useCallback(async (
    transaction: Omit<DatabaseTransaction, 'id'>,
    password: string,
    userId: string
  ): Promise<Omit<DatabaseTransaction, 'id'>> => {
    // Encrypt sensitive fields including amount as part of description
    const dataToEncrypt = JSON.stringify({
      description: transaction.description,
      amount: transaction.amount,
      merchant: transaction.merchant,
      category_name: transaction.category_name,
      notes: transaction.notes,
    });

    const encryptedData = await encryptValue(dataToEncrypt, password, userId);

    return {
      ...transaction,
      description: encryptedData, // All sensitive data encrypted here
      amount: 0, // Store 0 in DB
      merchant: undefined,
      category_name: undefined,
      notes: null,
    };
  }, []);

  // Load and decrypt accounts
  const loadAccounts = useCallback(async () => {
    if (!user?.id) return [];
    
    const password = getPassword();
    if (!password) return [];

    try {
      const rawAccounts = await databaseService.getAccounts();
      
      const decryptedAccounts = await Promise.all(
        rawAccounts.map(async (account) => {
          try {
            if (isEncrypted(account.bank_name)) {
              // Decrypt the JSON blob
              const decryptedJson = await decryptValue(account.bank_name, password, user.id);
              const data = JSON.parse(decryptedJson);
              
              const account_number = account.account_number && isEncrypted(account.account_number)
                ? await decryptValue(account.account_number, password, user.id)
                : account.account_number;

              return {
                ...account,
                bank_name: data.name,
                balance: data.balance,
                account_number: account_number || account.account_number,
              };
            }
            return account;
          } catch (e) {
            console.error('Failed to decrypt account:', account.id, e);
            return {
              ...account,
              bank_name: '[Encrypted - wrong password?]',
              balance: 0,
            };
          }
        })
      );

      setAccounts(decryptedAccounts);
      return decryptedAccounts;
    } catch (error) {
      console.error('Error loading accounts:', error);
      throw error;
    }
  }, [user?.id, getPassword]);

  // Load and decrypt transactions
  const loadTransactions = useCallback(async (accountId?: string) => {
    if (!user?.id) return [];
    
    const password = getPassword();
    if (!password) return [];

    try {
      const rawTransactions = await databaseService.getTransactions(accountId);
      
      const decryptedTransactions = await Promise.all(
        rawTransactions.map(async (transaction) => {
          try {
            if (isEncrypted(transaction.description)) {
              // Decrypt the JSON blob
              const decryptedJson = await decryptValue(transaction.description, password, user.id);
              const data = JSON.parse(decryptedJson);

              return {
                ...transaction,
                description: data.description,
                amount: data.amount,
                merchant: data.merchant,
                category_name: data.category_name,
                notes: data.notes,
              };
            }
            return transaction;
          } catch (e) {
            console.error('Failed to decrypt transaction:', transaction.id, e);
            return {
              ...transaction,
              description: '[Encrypted]',
              amount: 0,
            };
          }
        })
      );

      setTransactions(decryptedTransactions);
      return decryptedTransactions;
    } catch (error) {
      console.error('Error loading transactions:', error);
      throw error;
    }
  }, [user?.id, getPassword]);

  // Save encrypted account
  const saveAccount = useCallback(async (
    account: Omit<DatabaseAccount, 'id'>
  ): Promise<DatabaseAccount> => {
    if (!user?.id) throw new Error('User not authenticated');
    
    const password = getPassword();
    if (!password) throw new Error('Encryption key not found');

    const encryptedAccount = await encryptAccountData(account, password, user.id);
    const saved = await databaseService.saveAccount(encryptedAccount);
    
    // Return decrypted version
    return {
      ...saved,
      bank_name: account.bank_name,
      balance: account.balance,
      account_number: account.account_number,
    };
  }, [user?.id, getPassword, encryptAccountData]);

  // Save encrypted transactions
  const saveTransactions = useCallback(async (
    transactionsToSave: Omit<DatabaseTransaction, 'id'>[]
  ): Promise<DatabaseTransaction[]> => {
    if (!user?.id) throw new Error('User not authenticated');
    
    const password = getPassword();
    if (!password) throw new Error('Encryption key not found');

    const encryptedTransactions = await Promise.all(
      transactionsToSave.map(t => encryptTransactionData(t, password, user.id))
    );

    const saved = await databaseService.saveTransactions(encryptedTransactions);
    
    // Return with original (decrypted) data
    return saved.map((savedTx, index) => ({
      ...savedTx,
      description: transactionsToSave[index].description,
      amount: transactionsToSave[index].amount,
      merchant: transactionsToSave[index].merchant,
      category_name: transactionsToSave[index].category_name,
      notes: transactionsToSave[index].notes,
    }));
  }, [user?.id, getPassword, encryptTransactionData]);

  // Update transaction category (encrypted)
  const updateTransactionCategory = useCallback(async (
    transactionId: string,
    categoryName: string
  ): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');
    
    const password = getPassword();
    if (!password) throw new Error('Encryption key not found');

    // For category updates, we need to re-encrypt the entire transaction
    // First find the transaction in our decrypted list
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) throw new Error('Transaction not found');

    // Re-encrypt with new category
    const dataToEncrypt = JSON.stringify({
      description: transaction.description,
      amount: transaction.amount,
      merchant: transaction.merchant,
      category_name: categoryName,
      notes: transaction.notes,
    });

    const encryptedData = await encryptValue(dataToEncrypt, password, user.id);

    // Update in database with encrypted data
    await databaseService.updateTransactionCategory(transactionId, encryptedData);

    // Update local state
    setTransactions(prev => 
      prev.map(t => t.id === transactionId ? { ...t, category_name: categoryName } : t)
    );
  }, [user?.id, getPassword, transactions]);

  // Load all data
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadAccounts(), loadTransactions()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadAccounts, loadTransactions]);

  // Auto-load on mount
  useEffect(() => {
    if (user?.id && getStoredEncryptionPassword()) {
      loadAllData();
    }
  }, [user?.id, loadAllData]);

  return {
    accounts,
    transactions,
    isLoading,
    encryptionError,
    saveAccount,
    saveTransactions,
    updateTransactionCategory,
    loadAccounts,
    loadTransactions,
    loadAllData,
    deleteAccount: databaseService.deleteAccount.bind(databaseService),
    getHiddenAccounts: databaseService.getHiddenAccounts.bind(databaseService),
    restoreAccount: databaseService.restoreAccount.bind(databaseService),
  };
};
