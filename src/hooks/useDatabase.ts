/**
 * useDatabase hook - now uses encrypted database operations
 * 
 * This is the primary hook for database operations with zero-knowledge encryption.
 * All sensitive financial data is encrypted client-side before being stored.
 */

import { useState, useEffect } from 'react';
import { DatabaseCategory } from '@/services/databaseService';
import { databaseService } from '@/services/databaseService';
import { useEncryptedDatabase } from '@/hooks/useEncryptedDatabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getStoredEncryptionPassword } from '@/lib/encryption';

export const useDatabase = () => {
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use encrypted database for accounts and transactions
  const {
    accounts,
    transactions,
    isLoading,
    saveAccount,
    saveTransactions,
    updateTransactionCategory,
    loadAllData: loadEncryptedData,
    deleteAccount,
  } = useEncryptedDatabase();

  // Load categories (not encrypted - they're not sensitive)
  useEffect(() => {
    if (user) {
      loadCategories();
    } else {
      setCategories([]);
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      const categoriesData = await databaseService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadAllData = async () => {
    // Check for encryption password
    const password = getStoredEncryptionPassword();
    if (!password) {
      console.warn('⚠️ No encryption password found. Please sign in again.');
      toast({
        title: "Session Required",
        description: "Please sign in to view your encrypted data.",
        variant: "destructive",
      });
      return;
    }
    
    await Promise.all([
      loadEncryptedData(),
      loadCategories(),
    ]);
  };

  return {
    accounts,
    transactions,
    categories,
    isLoading,
    loadAllData,
    saveAccount,
    saveTransactions,
    updateTransactionCategory,
    deleteAccount,
  };
};
