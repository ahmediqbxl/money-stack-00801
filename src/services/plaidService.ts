
import { supabase } from '@/integrations/supabase/client';

interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string;
  };
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  category_id?: string;
}

interface PlaidApiResponse {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
  holdings?: any[];
  securities?: any[];
  metadata?: {
    totalTransactions: number;
    totalAvailable: number;
    dateRange: { startDate: string; endDate: string };
    daysBack: number;
    requestCount: number;
    hasInvestmentData?: boolean;
  };
}

interface FetchOptions {
  daysBack?: number;
  maxTransactions?: number;
}

class PlaidService {
  constructor() {
    console.log('🏗️ PlaidService constructor called - using production Plaid API via edge functions');
  }

  async createLinkToken(userId: string): Promise<string> {
    console.log('🚀 createLinkToken called for user:', userId);
    
    try {
      console.log('📡 Calling create-plaid-link-token edge function...');
      
      const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { userId }
      });
      
      console.log('📊 Edge function response received');
      
      if (error) {
        console.error('❌ Edge function error:', error);
        
        // Check for specific credential errors
        if (error.message && error.message.includes('INVALID_API_KEYS')) {
          throw new Error('Invalid Plaid credentials: Please verify your production PLAID_CLIENT_ID and PLAID_SECRET_KEY are correct and active.');
        }
        
        throw new Error(`Edge function error: ${JSON.stringify(error)}`);
      }
      
      if (!data || !data.link_token) {
        console.error('❌ No link token in response:', data);
        throw new Error('No link token received from edge function');
      }

      console.log('✅ Production link token created successfully via edge function');
      return data.link_token;
    } catch (error) {
      console.error('💥 createLinkToken failed:', error);
      throw error;
    }
  }

  async exchangePublicToken(publicToken: string, userId: string): Promise<string> {
    console.log('🔄 Exchanging public token...');
    
    try {
      console.log('📡 Calling exchange-plaid-token edge function...');
      
      const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
        body: { publicToken, userId }
      });
      
      console.log('📊 Token exchange response received');
      
      if (error) {
        console.error('❌ Token exchange edge function error:', error);
        throw new Error(`Token exchange error: ${JSON.stringify(error)}`);
      }
      
      if (!data || !data.access_token) {
        console.error('❌ No access token in response:', data);
        throw new Error('No access token received from edge function');
      }

      console.log('✅ Production access token received via edge function');
      return data.access_token;
    } catch (error) {
      console.error('💥 exchangePublicToken failed:', error);
      throw error;
    }
  }

  async getAccountsAndTransactions(
    accessToken: string,
    userId: string,
    options: FetchOptions = {}
  ): Promise<PlaidApiResponse> {
    const { daysBack = 90, maxTransactions = 2000 } = options;
    
    console.log('🔍 Fetching accounts and transactions:', {
      daysBack,
      maxTransactions
    });
    
    try {
      console.log('📡 Calling fetch-plaid-data edge function...');
      
      const { data, error } = await supabase.functions.invoke('fetch-plaid-data', {
        body: { 
          accessToken,
          userId,
          daysBack,
          maxTransactions
        }
      });
      
      console.log('📊 Production fetch data response:');
      console.log('  - Data structure:', {
        hasAccounts: !!data?.accounts,
        hasTransactions: !!data?.transactions,
        hasMetadata: !!data?.metadata,
        accountsCount: data?.accounts?.length || 0,
        transactionsCount: data?.transactions?.length || 0,
        metadata: data?.metadata
      });
      console.log('  - Sample account:', data?.accounts?.[0]);
      console.log('  - Sample transaction:', data?.transactions?.[0]);
      console.log('  - Error:', error);
      
      if (error) {
        console.error('❌ Production fetch data edge function error:', error);
        throw new Error(`Fetch data error: ${JSON.stringify(error)}`);
      }
      
      if (!data) {
        console.error('❌ No data returned from edge function');
        throw new Error('No data received from edge function');
      }

      // Ensure we have arrays even if empty
      const accounts = data.accounts || [];
      const transactions = data.transactions || [];

      console.log('✅ Production Plaid data processed successfully:', {
        accounts: accounts.length,
        transactions: transactions.length,
        metadata: data.metadata,
        accountsSample: accounts.slice(0, 2),
        transactionsSample: transactions.slice(0, 3)
      });

      return {
        accounts: accounts,
        transactions: transactions,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('💥 getAccountsAndTransactions failed:', error);
      throw error;
    }
  }
}

export const plaidService = new PlaidService();
