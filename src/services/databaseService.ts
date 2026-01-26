import { supabase } from '@/integrations/supabase/client';

export interface DatabaseAccount {
  id: string;
  external_account_id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  provider: 'plaid' | 'flinks';
  connected_at: string;
  last_synced_at: string;
  is_active: boolean;
  updated_at?: string;
  auto_classification?: 'asset' | 'liability' | null;
  user_classification?: 'asset' | 'liability' | null;
}

export interface DatabaseTransaction {
  id: string;
  account_id: string;
  external_transaction_id: string;
  description: string;
  amount: number;
  date: string;
  merchant?: string;
  category_name?: string;
  is_manual_category: boolean;
  notes?: string | null;
}

export interface DatabaseCategory {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

class DatabaseService {
  // Account operations
  async getAccounts(): Promise<DatabaseAccount[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Only fetch active accounts
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    console.log('📊 Fetched active accounts from database:', {
      count: data?.length || 0,
      userId: user.id
    });

    // Type assertion to handle the provider field correctly
    return (data || []).map(account => ({
      ...account,
      provider: account.provider as 'plaid' | 'flinks'
    }));
  }

  async getHiddenAccounts(): Promise<DatabaseAccount[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch hidden (inactive) accounts
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching hidden accounts:', error);
      throw error;
    }

    console.log('📊 Fetched hidden accounts from database:', {
      count: data?.length || 0,
      userId: user.id
    });

    return (data || []).map(account => ({
      ...account,
      provider: account.provider as 'plaid' | 'flinks'
    }));
  }

  async restoreAccount(accountId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('🔄 Restoring account:', { accountId, userId: user.id });

    const { error } = await supabase
      .from('accounts')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error restoring account:', error);
      throw error;
    }

    console.log('✅ Account restored successfully:', accountId);
  }

  async saveAccount(account: Omit<DatabaseAccount, 'id'>): Promise<DatabaseAccount> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First check by exact external_account_id match
    const { data: exactMatch } = await supabase
      .from('accounts')
      .select('*')
      .eq('external_account_id', account.external_account_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (exactMatch) {
      console.log('Account already exists (exact match), updating balance:', exactMatch.id);
      // Update the balance and sync time
      const { data: updated, error: updateError } = await supabase
        .from('accounts')
        .update({
          balance: account.balance,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', exactMatch.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating account:', updateError);
        throw updateError;
      }
      
      return {
        ...updated,
        provider: updated.provider as 'plaid' | 'flinks'
      };
    }

    // For sandbox reconnections: check if an account with same bank_name and account_type already exists
    // This handles the case where Plaid sandbox generates new external_account_ids on reconnection
    const { data: similarAccounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_type', account.account_type)
      .eq('bank_name', account.bank_name)
      .eq('provider', account.provider)
      .eq('is_active', true);

    if (similarAccounts && similarAccounts.length > 0) {
      const existingAccount = similarAccounts[0];
      console.log('Found similar account (sandbox reconnection), updating:', existingAccount.id);
      
      // Update the existing account with new external_account_id and balance
      const { data: updated, error: updateError } = await supabase
        .from('accounts')
        .update({
          external_account_id: account.external_account_id,
          balance: account.balance,
          account_number: account.account_number,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating similar account:', updateError);
        throw updateError;
      }
      
      return {
        ...updated,
        provider: updated.provider as 'plaid' | 'flinks'
      };
    }

    // Account doesn't exist, insert it
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...account,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving account:', error);
      throw error;
    }

    console.log('✅ New account created successfully:', data);
    return {
      ...data,
      provider: data.provider as 'plaid' | 'flinks'
    };
  }

  async deleteAccount(accountId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('🗑️ Starting soft delete for account:', { accountId, userId: user.id });
    
    // Verify the account exists and belongs to the user
    const { data: accountCheck, error: checkError } = await supabase
      .from('accounts')
      .select('id, user_id, bank_name, external_account_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !accountCheck) {
      console.error('❌ Account not found or access denied:', checkError);
      throw new Error('Account not found or access denied');
    }

    console.log('✅ Account verified for soft delete:', accountCheck);

    // Soft delete: Set is_active to false instead of deleting
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Error soft deleting account:', updateError);
      throw updateError;
    }

    console.log('✅ Account soft deleted (is_active = false):', { 
      accountId, 
      bankName: accountCheck.bank_name 
    });

    // Verify the soft delete worked
    const { data: remainingAccounts } = await supabase
      .from('accounts')
      .select('id, bank_name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    console.log('📊 Remaining active accounts after soft delete:', {
      count: remainingAccounts?.length || 0,
      accounts: remainingAccounts?.map(a => ({ id: a.id, name: a.bank_name }))
    });
  }

  // Transaction operations
  async getTransactions(accountId?: string): Promise<DatabaseTransaction[]> {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        accounts!inner(id, bank_name, is_active)
      `)
      .order('date', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Only get transactions from active accounts
    query = query.eq('accounts.is_active', true);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    return data || [];
  }

  async saveTransactions(transactions: Omit<DatabaseTransaction, 'id'>[]): Promise<DatabaseTransaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const transactionsWithUserId = transactions.map(t => ({
      ...t,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .upsert(transactionsWithUserId, {
        onConflict: 'external_transaction_id,account_id'
      })
      .select();

    if (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }

    return data || [];
  }

  async updateTransactionCategory(transactionId: string, categoryName: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({
        category_name: categoryName,
        is_manual_category: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    if (error) {
      console.error('Error updating transaction category:', error);
      throw error;
    }
  }

  // Category operations
  async getCategories(): Promise<DatabaseCategory[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  }

  async saveCategory(category: Omit<DatabaseCategory, 'id'>): Promise<DatabaseCategory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        ...category,
        user_id: user.id,
        is_default: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving category:', error);
      throw error;
    }

    return data;
  }

  // User preferences
  async getUserPreferences() {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching user preferences:', error);
      throw error;
    }

    return data;
  }

  async saveUserPreferences(preferences: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        ...preferences,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }

    return data;
  }
}

export const databaseService = new DatabaseService();
