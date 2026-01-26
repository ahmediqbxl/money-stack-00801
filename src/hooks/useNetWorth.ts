/**
 * Hook for net worth calculations and account classification
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEncryptedDatabase } from './useEncryptedDatabase';
import { useToast } from './use-toast';
import { 
  getStoredEncryptionPassword, 
  encryptValue, 
  decryptValue,
  isEncrypted 
} from '@/lib/encryption';

export type AccountClassification = 'asset' | 'liability';

export interface ManualAccount {
  id: string;
  name: string;
  account_type: string;
  classification: AccountClassification;
  balance: number;
  currency: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  created_at: string;
}

export interface NetWorthGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  target_date?: string;
  description?: string;
  is_achieved: boolean;
  achieved_date?: string;
  created_at: string;
  updated_at: string;
}

// Auto-classify based on account type
export const getAutoClassification = (accountType: string): AccountClassification => {
  const type = accountType.toLowerCase();
  
  // Assets
  if (type.includes('checking') || type.includes('chequing') ||
      type.includes('savings') || type.includes('saving') ||
      type.includes('investment') || type.includes('brokerage') ||
      type.includes('401k') || type.includes('ira') ||
      type.includes('money market') || type.includes('cd') ||
      type.includes('prepaid') || type.includes('hsa') ||
      type.includes('paypal') || type.includes('venmo')) {
    return 'asset';
  }
  
  // Liabilities
  if (type.includes('credit') || type.includes('loan') ||
      type.includes('mortgage') || type.includes('line of credit') ||
      type.includes('overdraft') || type.includes('student')) {
    return 'liability';
  }
  
  // Default to asset
  return 'asset';
};

export const useNetWorth = () => {
  const [manualAccounts, setManualAccounts] = useState<ManualAccount[]>([]);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [goals, setGoals] = useState<NetWorthGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { accounts: plaidAccounts, deleteAccount, loadAccounts } = useEncryptedDatabase();

  // Load manual accounts with caching
  const loadManualAccounts = useCallback(async () => {
    if (!user?.id) return;
    
    const password = getStoredEncryptionPassword();
    if (!password) return;

    try {
      // Try to load from cache first for instant display
      const cacheKey = `manual_accounts_cache_${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        setManualAccounts(cachedData);
      }

      const { data, error } = await supabase
        .from('manual_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Decrypt manual accounts
      const decrypted = await Promise.all(
        (data || []).map(async (account) => {
          try {
            if (isEncrypted(account.name)) {
              const decryptedJson = await decryptValue(account.name, password, user.id);
              const parsed = JSON.parse(decryptedJson);
              return {
                ...account,
                name: parsed.name,
                balance: parsed.balance,
                notes: parsed.notes,
              };
            }
            return account;
          } catch {
            return {
              ...account,
              name: '[Encrypted]',
              balance: 0,
            };
          }
        })
      );

      // Cache for next time
      sessionStorage.setItem(cacheKey, JSON.stringify(decrypted));
      
      setManualAccounts(decrypted);
    } catch (error) {
      console.error('Error loading manual accounts:', error);
    }
  }, [user?.id]);

  // Load snapshots
  const loadSnapshots = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('net_worth_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(365); // Last year of daily snapshots

      if (error) throw error;
      setSnapshots(data || []);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  }, [user?.id]);

  // Load goals
  const loadGoals = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('net_worth_goals')
        .select('*')
        .order('target_date', { ascending: true });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }, [user?.id]);

  // Update account classification
  const updateAccountClassification = useCallback(async (
    accountId: string,
    classification: AccountClassification
  ) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ user_classification: classification })
        .eq('id', accountId);

      if (error) throw error;
      
      // Invalidate cache and reload accounts
      if (user?.id) {
        sessionStorage.removeItem(`accounts_cache_${user.id}`);
      }
      await loadAccounts();
      
      toast({
        title: "Classification Updated",
        description: `Account reclassified as ${classification}`,
      });
    } catch (error) {
      console.error('Error updating classification:', error);
      toast({
        title: "Error",
        description: "Failed to update classification",
        variant: "destructive",
      });
    }
  }, [toast, user?.id, loadAccounts]);

  // Add manual account
  const addManualAccount = useCallback(async (
    account: Omit<ManualAccount, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ): Promise<boolean> => {
    if (!user?.id) return false;

    const password = getStoredEncryptionPassword();
    if (!password) {
      toast({
        title: "Session Required",
        description: "Please sign in to add accounts",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Encrypt sensitive data
      const encryptedData = await encryptValue(
        JSON.stringify({
          name: account.name,
          balance: account.balance,
          notes: account.notes,
        }),
        password,
        user.id
      );

      const { error } = await supabase
        .from('manual_accounts')
        .insert({
          user_id: user.id,
          name: encryptedData,
          account_type: account.account_type,
          classification: account.classification,
          balance: 0, // Store 0, real value encrypted
          currency: account.currency,
          notes: null,
        });

      if (error) throw error;

      // Invalidate cache
      sessionStorage.removeItem(`manual_accounts_cache_${user.id}`);

      toast({
        title: "Account Added",
        description: `${account.name} has been added`,
      });

      // Immediately reload to show the new account
      await loadManualAccounts();
      return true;
    } catch (error) {
      console.error('Error adding manual account:', error);
      toast({
        title: "Error",
        description: "Failed to add account",
        variant: "destructive",
      });
      return false;
    }
  }, [user?.id, toast, loadManualAccounts]);

  // Update manual account
  const updateManualAccount = useCallback(async (
    accountId: string,
    updates: Partial<ManualAccount>
  ) => {
    if (!user?.id) return;

    const password = getStoredEncryptionPassword();
    if (!password) return;

    try {
      // If updating name, balance, or notes, re-encrypt
      if (updates.name || updates.balance !== undefined || updates.notes !== undefined) {
        const existingAccount = manualAccounts.find(a => a.id === accountId);
        if (!existingAccount) return;

        const encryptedData = await encryptValue(
          JSON.stringify({
            name: updates.name ?? existingAccount.name,
            balance: updates.balance ?? existingAccount.balance,
            notes: updates.notes ?? existingAccount.notes,
          }),
          password,
          user.id
        );

        const { error } = await supabase
          .from('manual_accounts')
          .update({
            name: encryptedData,
            account_type: updates.account_type ?? existingAccount.account_type,
            classification: updates.classification ?? existingAccount.classification,
            balance: 0,
            currency: updates.currency ?? existingAccount.currency,
          })
          .eq('id', accountId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('manual_accounts')
          .update(updates)
          .eq('id', accountId);

        if (error) throw error;
      }

      toast({
        title: "Account Updated",
        description: "Changes saved successfully",
      });

      await loadManualAccounts();
    } catch (error) {
      console.error('Error updating manual account:', error);
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive",
      });
    }
  }, [user?.id, manualAccounts, toast, loadManualAccounts]);

  // Delete manual account and invalidate cache
  const deleteManualAccount = useCallback(async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('manual_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;

      // Invalidate cache
      if (user?.id) {
        sessionStorage.removeItem(`manual_accounts_cache_${user.id}`);
      }

      toast({
        title: "Account Removed",
        description: "Account has been removed",
      });

      await loadManualAccounts();
    } catch (error) {
      console.error('Error deleting manual account:', error);
      toast({
        title: "Error",
        description: "Failed to remove account",
        variant: "destructive",
      });
    }
  }, [toast, loadManualAccounts, user?.id]);

  // Delete Plaid account
  const deletePlaidAccount = useCallback(async (accountId: string) => {
    try {
      await deleteAccount(accountId);

      toast({
        title: "Account Removed",
        description: "Connected account has been removed",
      });

      await loadAccounts();
    } catch (error) {
      console.error('Error deleting Plaid account:', error);
      toast({
        title: "Error",
        description: "Failed to remove connected account",
        variant: "destructive",
      });
    }
  }, [deleteAccount, loadAccounts, toast]);

  // Add goal
  const addGoal = useCallback(async (
    goal: Omit<NetWorthGoal, 'id' | 'created_at' | 'updated_at' | 'is_achieved' | 'achieved_date'>
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('net_worth_goals')
        .insert({
          user_id: user.id,
          ...goal,
        });

      if (error) throw error;

      toast({
        title: "Goal Created",
        description: `${goal.goal_name} has been set`,
      });

      await loadGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    }
  }, [user?.id, toast, loadGoals]);

  // Calculate net worth from all accounts
  const calculateNetWorth = useCallback(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    // Process Plaid accounts - use user_classification if set, otherwise auto
    plaidAccounts.forEach(account => {
      const autoClassification = getAutoClassification(account.account_type);
      const classification = account.user_classification || autoClassification;
      const balance = Math.abs(account.balance);
      
      if (classification === 'asset') {
        totalAssets += balance;
      } else {
        totalLiabilities += balance;
      }
    });

    // Process manual accounts
    manualAccounts.forEach(account => {
      const balance = Math.abs(account.balance);
      
      if (account.classification === 'asset') {
        totalAssets += balance;
      } else {
        totalLiabilities += balance;
      }
    });

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [plaidAccounts, manualAccounts]);

  // Save daily snapshot
  const saveDailySnapshot = useCallback(async () => {
    if (!user?.id) return;

    const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth();

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('net_worth_snapshots')
        .upsert({
          user_id: user.id,
          snapshot_date: today,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
        }, {
          onConflict: 'user_id,snapshot_date',
        });

      if (error) throw error;
      await loadSnapshots();
    } catch (error) {
      console.error('Error saving snapshot:', error);
    }
  }, [user?.id, loadSnapshots, calculateNetWorth]);

  // Get accounts by classification
  const accountsByClassification = useMemo(() => {
    const assets: Array<{ id: string; name: string; balance: number; type: string; source: 'plaid' | 'manual'; isOverridden?: boolean }> = [];
    const liabilities: Array<{ id: string; name: string; balance: number; type: string; source: 'plaid' | 'manual'; isOverridden?: boolean }> = [];

    plaidAccounts.forEach(account => {
      // Use user_classification if set, otherwise fall back to auto classification
      const autoClassification = getAutoClassification(account.account_type);
      const classification = account.user_classification || autoClassification;
      const isOverridden = account.user_classification && account.user_classification !== autoClassification;
      
      const item = {
        id: account.id,
        name: account.bank_name,
        balance: Math.abs(account.balance),
        type: account.account_type,
        source: 'plaid' as const,
        isOverridden,
      };
      
      if (classification === 'asset') {
        assets.push(item);
      } else {
        liabilities.push(item);
      }
    });

    manualAccounts.forEach(account => {
      const item = {
        id: account.id,
        name: account.name,
        balance: Math.abs(account.balance),
        type: account.account_type,
        source: 'manual' as const,
      };
      
      if (account.classification === 'asset') {
        assets.push(item);
      } else {
        liabilities.push(item);
      }
    });

    return { assets, liabilities };
  }, [plaidAccounts, manualAccounts]);

  // Load all data
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadManualAccounts(),
        loadSnapshots(),
        loadGoals(),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [loadManualAccounts, loadSnapshots, loadGoals]);

  // Auto-load on mount
  useEffect(() => {
    if (user?.id && getStoredEncryptionPassword()) {
      loadAllData();
    }
  }, [user?.id, loadAllData]);

  // Save snapshot when accounts change
  useEffect(() => {
    if (user?.id && (plaidAccounts.length > 0 || manualAccounts.length > 0)) {
      saveDailySnapshot();
    }
  }, [user?.id, plaidAccounts.length, manualAccounts.length, saveDailySnapshot]);

  return {
    manualAccounts,
    snapshots,
    goals,
    isLoading,
    calculateNetWorth,
    accountsByClassification,
    updateAccountClassification,
    addManualAccount,
    updateManualAccount,
    deleteManualAccount,
    deletePlaidAccount,
    addGoal,
    loadAllData,
  };
};
