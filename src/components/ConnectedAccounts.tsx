import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PlaidConnect, { PlaidConnectRef } from './PlaidConnect';
import { usePlaidData } from '@/hooks/usePlaidData';
import { useDatabase } from '@/hooks/useDatabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ConnectedAccounts = () => {
  const [isRecentTransactionsOpen, setIsRecentTransactionsOpen] = useState(true);
  const plaidConnectRef = useRef<PlaidConnectRef>(null);
  const { toast } = useToast();
  const { deleteAccount } = useDatabase();
  const {
    accounts,
    transactions,
    isLoading,
    fetchPlaidData,
    handlePlaidSuccess,
    lastFetchMetadata,
    plaidAccessToken,
  } = usePlaidData();

  const handleRefreshAccounts = async () => {
    toast({
      title: "Refreshing...",
      description: "Fetching latest transactions from Plaid",
    });
    await fetchPlaidData();
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      await deleteAccount(accountId);
      
      // Also clean up localStorage if no accounts remain
      const remainingAccounts = accounts.filter(a => a.id !== accountId);
      if (remainingAccounts.length === 0) {
        localStorage.removeItem('plaid_access_token');
      }
    } catch (error) {
      console.error('Error removing account:', error);
    }
  };

  const handleConnectSuccess = async (accessToken: string) => {
    console.log('Connect success - passing token to handlePlaidSuccess:', accessToken.substring(0, 20) + '...');
    await handlePlaidSuccess(accessToken);
    
    toast({
      title: "Account Connected",
      description: "Your bank account has been successfully connected via Plaid!",
    });
  };

  const handleAddAccount = () => {
    plaidConnectRef.current?.connect();
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <div className="space-y-6">
      {/* Hidden PlaidConnect component */}
      <div style={{ display: 'none' }}>
        <PlaidConnect ref={plaidConnectRef} onSuccess={handleConnectSuccess} />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Connected Accounts</h3>
          {accounts.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Total Balance: <span className="font-semibold text-green-600">${totalBalance.toLocaleString()}</span>
              </p>
              {lastFetchMetadata && (
                <p className="text-xs text-gray-500">
                  Last sync: {lastFetchMetadata.totalTransactions} transactions 
                  ({lastFetchMetadata.daysBack} days, {lastFetchMetadata.requestCount} API calls)
                  • AI categorization enabled
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          {accounts.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAccounts}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={handleAddAccount}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{account.bank_name}</CardTitle>
                    <CardDescription>
                      {account.account_type} • {account.account_number}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">Connected via {account.provider}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAccount(account.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${account.balance.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Connected</p>
                  <p className="text-sm font-medium">{new Date(account.connected_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Accounts</h3>
            <p className="text-gray-500 mb-4">
              Connect your first bank account using Plaid to start tracking your finances
            </p>
            <Button
              onClick={handleAddAccount}
              className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Account
            </Button>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <Collapsible open={isRecentTransactionsOpen} onOpenChange={setIsRecentTransactionsOpen}>
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle>Recent Transactions ({transactions.length})</CardTitle>
                  <CardDescription>
                    Latest transactions from your connected accounts (Auto-categorized by AI)
                    {lastFetchMetadata && lastFetchMetadata.totalAvailable > transactions.length && (
                      <span className="text-orange-600">
                        {" "}• {lastFetchMetadata.totalAvailable - transactions.length} more available
                      </span>
                    )}
                  </CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isRecentTransactionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {transaction.merchant && `${transaction.merchant} • `}
                          {transaction.category_name && (
                            <Badge variant="outline" className="text-xs">{transaction.category_name}</Badge>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium text-sm ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default ConnectedAccounts;
