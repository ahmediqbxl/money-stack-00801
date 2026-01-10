
import { useState, useEffect, useCallback } from 'react';
import { plaidService } from '@/services/plaidService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/hooks/useDatabase';
import { useAuth } from '@/contexts/AuthContext';

interface PlaidAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  connected_at: string;
}

interface PlaidTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  merchant?: string;
  category?: string;
}

export const usePlaidData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [plaidAccessToken, setPlaidAccessToken] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [lastFetchMetadata, setLastFetchMetadata] = useState<any>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    accounts, 
    transactions, 
    saveAccount, 
    saveTransactions, 
    updateTransactionCategory 
  } = useDatabase();

  // Load stored Plaid access token from localStorage
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('plaid_access_token');
    if (storedAccessToken) {
      setPlaidAccessToken(storedAccessToken);
    }
  }, []);

  // Auto-categorize transactions when they're loaded
  const autoCategorizeTransactions = useCallback(async (transactionsToProcess: any[]) => {
    if (transactionsToProcess.length === 0) return;

    console.log('🤖 Auto-categorizing', transactionsToProcess.length, 'transactions');
    
    try {
      const { data, error } = await supabase.functions.invoke('categorize-transactions', {
        body: { transactions: transactionsToProcess }
      });

      if (error) throw error;

      console.log('🤖 Auto-categorization response:', data);

      // Update categories for uncategorized transactions
      const updatePromises = data.categorizedTransactions.map((catTrans: any) => {
        const originalTrans = transactionsToProcess.find(t => 
          t.description === catTrans.description || 
          (Math.abs(t.amount - Math.abs(catTrans.amount)) < 0.01 &&
           t.description.toLowerCase().includes(catTrans.description.toLowerCase().split(' ')[0]))
        );
        
        if (originalTrans && catTrans.category && !originalTrans.is_manual_category) {
          console.log('🤖 Auto-updating category for:', originalTrans.description, 'to', catTrans.category);
          return updateTransactionCategory(originalTrans.id, catTrans.category);
        }
      }).filter(Boolean);

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log('✅ Auto-categorized', updatePromises.length, 'transactions');
      }
    } catch (error) {
      console.error('❌ Auto-categorization failed:', error);
      // Don't show error toast for auto-categorization failures
    }
  }, [updateTransactionCategory]);

  const fetchPlaidData = useCallback(async (
    accessToken?: string, 
    options: { daysBack?: number; maxTransactions?: number } = {}
  ) => {
    // Use provided token or stored token
    const tokenToUse = accessToken || plaidAccessToken || localStorage.getItem('plaid_access_token');
    
    if (!tokenToUse || isLoading) {
      console.log('Cannot fetch Plaid data:', { hasToken: !!tokenToUse, isLoading });
      return;
    }
    
    const { daysBack = 90, maxTransactions = 2000 } = options;
    
    console.log('🚀 Starting enhanced Plaid data fetch:', {
      daysBack,
      maxTransactions
    });
    setIsLoading(true);
    
    try {
      // Fetch user's hidden accounts (is_active = false) to skip them
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let hiddenAccountIds: string[] = [];
      
      if (currentUser) {
        const { data: hiddenAccounts } = await supabase
          .from('accounts')
          .select('external_account_id')
          .eq('user_id', currentUser.id)
          .eq('is_active', false);
        
        hiddenAccountIds = (hiddenAccounts || []).map(a => a.external_account_id);
        console.log('🚫 Hidden account IDs (is_active=false):', hiddenAccountIds);
      }

      const data = await plaidService.getAccountsAndTransactions(tokenToUse, user?.id || '', {
        daysBack,
        maxTransactions
      });
      
      console.log('📊 Enhanced raw Plaid data received:', {
        accountsCount: data.accounts.length,
        transactionsCount: data.transactions.length,
        metadata: data.metadata,
        sampleAccount: data.accounts[0],
        sampleTransaction: data.transactions[0]
      });
      
      setLastFetchMetadata(data.metadata);
      
      // Filter out hidden accounts before saving
      const activeAccounts = data.accounts.filter(account => {
        const isHidden = hiddenAccountIds.includes(account.account_id);
        if (isHidden) {
          console.log('🚫 Skipping hidden account:', account.account_id, account.name);
        }
        return !isHidden;
      });
      
      console.log('📊 Filtered accounts:', {
        total: data.accounts.length,
        active: activeAccounts.length,
        hidden: data.accounts.length - activeAccounts.length
      });
      
      // Save accounts to database with better duplicate checking
      console.log('💾 Starting to save accounts...');
      const accountPromises = activeAccounts.map(async (account, index) => {
        console.log(`💾 Processing account ${index + 1}:`, {
          account_id: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          balance: account.balances.current
        });

        const dbAccount = {
          external_account_id: account.account_id,
          bank_name: account.name || 'Plaid Bank',
          account_type: account.subtype || account.type,
          account_number: `****${account.mask || '0000'}`,
          balance: account.balances.current || 0,
          currency: account.balances.iso_currency_code || 'CAD',
          provider: 'plaid' as const,
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          is_active: true,
        };
        
        console.log(`💾 Saving account ${index + 1} to database:`, dbAccount);
        return saveAccount(dbAccount);
      });

      const savedAccounts = await Promise.all(accountPromises);
      console.log('✅ Accounts saved successfully:', {
        count: savedAccounts.length,
        accounts: savedAccounts.map(acc => ({ id: acc.id, external_id: acc.external_account_id }))
      });

      // Transform and save transactions with better duplicate handling
      console.log('💾 Starting to transform and save enhanced transaction set...');
      const transformedTransactions = data.transactions.map((transaction, index) => {
        const accountId = savedAccounts.find(
          acc => acc.external_account_id === transaction.account_id
        )?.id;

        if (index < 5) { // Log first 5 for debugging
          console.log(`💾 Processing transaction ${index + 1}:`, {
            transaction_id: transaction.transaction_id,
            name: transaction.name,
            amount: transaction.amount,
            account_id: transaction.account_id,
            mapped_account_id: accountId
          });
        }

        return {
          account_id: accountId!,
          external_transaction_id: transaction.transaction_id,
          description: transaction.name,
          amount: -transaction.amount, // Plaid uses positive for debits
          date: transaction.date,
          merchant: transaction.merchant_name,
          category_name: transaction.category ? transaction.category[0] : undefined,
          is_manual_category: false,
        };
      }).filter(t => {
        if (!t.account_id) {
          console.warn('⚠️ Filtered out transaction without valid account_id:', t);
        }
        return t.account_id;
      });

      console.log('📊 Enhanced transactions transformed for database:', {
        originalCount: data.transactions.length,
        transformedCount: transformedTransactions.length,
        metadata: data.metadata,
        sample: transformedTransactions.slice(0, 3)
      });

      if (transformedTransactions.length > 0) {
        console.log('💾 Saving enhanced transaction set to database...');
        const savedTransactions = await saveTransactions(transformedTransactions);
        console.log('✅ Enhanced transactions saved successfully:', {
          count: savedTransactions.length,
          sample: savedTransactions.slice(0, 3).map(t => ({ 
            id: t.id, 
            description: t.description, 
            amount: t.amount 
          }))
        });

        // Auto-categorize the new transactions
        const uncategorizedTransactions = savedTransactions.filter(t => !t.category_name || !t.is_manual_category);
        if (uncategorizedTransactions.length > 0) {
          console.log('🤖 Starting auto-categorization for', uncategorizedTransactions.length, 'uncategorized transactions');
          // Run categorization in the background without awaiting
          setTimeout(() => autoCategorizeTransactions(uncategorizedTransactions), 1000);
        }
      } else {
        console.log('⚠️ No transactions to save after transformation');
      }

      setHasFetched(true);
      
      const successMessage = data.metadata 
        ? `Refreshed ${savedAccounts.length} accounts and ${transformedTransactions.length} transactions from the last ${data.metadata.daysBack} days. Note: New transactions may take a few minutes to appear in Plaid.`
        : `Refreshed ${savedAccounts.length} accounts and ${transformedTransactions.length} transactions. Note: New transactions may take a few minutes to appear in Plaid.`;
      
      toast({
        title: "✓ Refresh Complete",
        description: successMessage,
      });

      console.log('🎉 Enhanced Plaid data fetch and save completed successfully!');
    } catch (error: any) {
      console.error('💥 Error fetching enhanced Plaid data:', error);
      
      // Check if the error indicates re-authentication is needed
      const errorMessage = error?.message || '';
      const errorData = error?.context?.data || error?.data || {};
      
      if (errorMessage.includes('ITEM_LOGIN_REQUIRED') || 
          errorData.error_code === 'ITEM_LOGIN_REQUIRED' ||
          errorData.requires_reauth) {
        console.log('🔄 Re-authentication required - setting flag');
        setRequiresReauth(true);
        toast({
          title: "Re-authentication Required",
          description: "Your bank connection has expired. Please reconnect your bank account.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch account data from Plaid.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [plaidAccessToken, isLoading, saveAccount, saveTransactions, toast, autoCategorizeTransactions]);

  const handlePlaidSuccess = async (accessToken: string) => {
    console.log('🎯 Plaid success, storing token and fetching data...');
    localStorage.setItem('plaid_access_token', accessToken);
    setPlaidAccessToken(accessToken);
    setHasFetched(false); // Reset to allow fetching with new token
    setRequiresReauth(false); // Clear reauth flag after successful connection
    
    // Immediately fetch data with the new token and enhanced options
    console.log('🚀 Triggering immediate enhanced data fetch...');
    await fetchPlaidData(accessToken, { daysBack: 90, maxTransactions: 2000 });
  };
  
  const clearReauthFlag = () => {
    setRequiresReauth(false);
  };

  // Auto-fetch data on login if we have a token
  useEffect(() => {
    if (plaidAccessToken && !hasFetched && !isLoading) {
      console.log('🔄 Auto-fetching Plaid data on login...');
      fetchPlaidData();
    }
  }, [plaidAccessToken, hasFetched, isLoading, fetchPlaidData]);

  return {
    accounts,
    transactions,
    isLoading,
    fetchPlaidData,
    handlePlaidSuccess,
    lastFetchMetadata,
    plaidAccessToken,
    requiresReauth,
    clearReauthFlag,
  };
};
