import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, RotateCcw, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { databaseService, DatabaseAccount } from '@/services/databaseService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface HiddenAccountsProps {
  onAccountRestored: () => void;
}

const HiddenAccounts = ({ onAccountRestored }: HiddenAccountsProps) => {
  const [hiddenAccounts, setHiddenAccounts] = useState<DatabaseAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadHiddenAccounts = async () => {
    try {
      setIsLoading(true);
      const accounts = await databaseService.getHiddenAccounts();
      setHiddenAccounts(accounts);
    } catch (error) {
      console.error('Error loading hidden accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHiddenAccounts();
    }
  }, [isOpen]);

  const handleRestore = async (account: DatabaseAccount) => {
    try {
      setRestoringId(account.id);
      await databaseService.restoreAccount(account.id);
      
      // Remove from local state
      setHiddenAccounts(prev => prev.filter(a => a.id !== account.id));
      
      toast({
        title: "Account Restored",
        description: `${account.bank_name} has been restored and is now visible.`,
      });
      
      // Notify parent to refresh accounts list
      onAccountRestored();
    } catch (error) {
      console.error('Error restoring account:', error);
      toast({
        title: "Error",
        description: "Failed to restore account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-dashed border-muted-foreground/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Manage Hidden Accounts
                </CardTitle>
                {hiddenAccounts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {hiddenAccounts.length}
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading hidden accounts...
              </div>
            ) : hiddenAccounts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No hidden accounts</p>
                <p className="text-xs mt-1">
                  Accounts you hide will appear here and can be restored.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {hiddenAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{account.bank_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {account.account_type} • {account.account_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          ${account.balance.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Hidden {new Date(account.updated_at || account.connected_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(account)}
                        disabled={restoringId === account.id}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <RotateCcw className={`w-4 h-4 mr-1 ${restoringId === account.id ? 'animate-spin' : ''}`} />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default HiddenAccounts;