import React, { useState } from 'react';
import { Building2, Home, Car, Plus, Pencil, Trash2, ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNetWorth, AccountClassification, getAutoClassification, ManualAccount } from '@/hooks/useNetWorth';
import AddManualAccountDialog from './AddManualAccountDialog';

interface AccountItemProps {
  id: string;
  name: string;
  balance: number;
  type: string;
  source: 'plaid' | 'manual';
  classification: AccountClassification;
  isOverridden?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReclassify?: () => void;
}

const AccountItem = ({ name, balance, type, source, classification, isOverridden, onEdit, onDelete, onReclassify }: AccountItemProps) => {
  const getIcon = () => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('real estate') || lowerType.includes('home') || lowerType.includes('mortgage')) {
      return <Home className="w-5 h-5" />;
    }
    if (lowerType.includes('vehicle') || lowerType.includes('car')) {
      return <Car className="w-5 h-5" />;
    }
    return <Building2 className="w-5 h-5" />;
  };

  const targetClassification = classification === 'asset' ? 'Liability' : 'Asset';

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 border-2 border-foreground bg-card hover:bg-muted/50 transition-colors gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border-2 border-foreground flex-shrink-0 ${
          classification === 'asset' ? 'bg-accent/20' : 'bg-destructive/20'
        }`}>
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <p className="font-bold text-sm sm:text-base truncate">{name}</p>
            {isOverridden && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs">OVERRIDE</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span className="text-xs sm:text-sm text-muted-foreground capitalize">{type}</span>
            {source === 'plaid' && (
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2">PLAID</Badge>
            )}
            {source === 'manual' && (
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1 sm:px-2">MANUAL</Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <span className={`text-base sm:text-xl font-bold font-display ${
          classification === 'asset' ? 'text-accent' : 'text-destructive'
        }`}>
          ${balance.toLocaleString()}
        </span>
        
        <div className="hidden sm:flex gap-1">
          {source === 'plaid' && onReclassify && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onReclassify} className="h-8 w-8 p-0">
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move to {targetClassification}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {source === 'manual' && onEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit Account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove Account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
};

const AccountsList = () => {
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [liabilitiesOpen, setLiabilitiesOpen] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [defaultClassification, setDefaultClassification] = useState<AccountClassification>('asset');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; name: string; source: 'plaid' | 'manual' } | null>(null);
  const [editAccount, setEditAccount] = useState<ManualAccount | null>(null);
  
  const { accountsByClassification, deleteManualAccount, deletePlaidAccount, updateAccountClassification, manualAccounts } = useNetWorth();
  const { assets, liabilities } = accountsByClassification;

  const handleAddAsset = () => {
    setEditAccount(null);
    setDefaultClassification('asset');
    setAddDialogOpen(true);
  };

  const handleAddLiability = () => {
    setEditAccount(null);
    setDefaultClassification('liability');
    setAddDialogOpen(true);
  };

  const handleEditAccount = (accountId: string) => {
    const account = manualAccounts.find(a => a.id === accountId);
    if (account) {
      setEditAccount(account);
      setDefaultClassification(account.classification);
      setAddDialogOpen(true);
    }
  };

  const handleDeleteClick = (account: { id: string; name: string; source: 'plaid' | 'manual' }) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    
    if (accountToDelete.source === 'manual') {
      await deleteManualAccount(accountToDelete.id);
    } else {
      await deletePlaidAccount(accountToDelete.id);
    }
    
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const handleDialogClose = (open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setEditAccount(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Assets Section */}
      <Collapsible open={assetsOpen} onOpenChange={setAssetsOpen}>
        <div className="brutalist-card">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b-2 border-foreground cursor-pointer hover:bg-muted/50 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="badge-asset text-[10px] sm:text-xs whitespace-nowrap">ASSETS</div>
                <span className="font-bold text-sm sm:text-lg truncate">
                  ${assets.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                </span>
                <span className="text-muted-foreground text-xs sm:text-base hidden sm:inline">
                  ({assets.length} account{assets.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleAddAsset(); }}
                  className="brutalist-button h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Add Asset</span>
                </Button>
                {assetsOpen ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="divide-y-2 divide-foreground">
              {assets.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No assets yet. Add your first asset!</p>
                  <Button onClick={handleAddAsset} className="brutalist-button bg-accent text-accent-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </div>
              ) : (
                assets.map((account) => (
                  <AccountItem
                    key={account.id}
                    {...account}
                    classification="asset"
                    onEdit={account.source === 'manual' ? () => handleEditAccount(account.id) : undefined}
                    onDelete={() => handleDeleteClick({ id: account.id, name: account.name, source: account.source })}
                    onReclassify={account.source === 'plaid' ? () => updateAccountClassification(account.id, 'liability') : undefined}
                  />
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Liabilities Section */}
      <Collapsible open={liabilitiesOpen} onOpenChange={setLiabilitiesOpen}>
        <div className="brutalist-card">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 sm:p-4 border-b-2 border-foreground cursor-pointer hover:bg-muted/50 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="badge-liability text-[10px] sm:text-xs whitespace-nowrap">LIABILITIES</div>
                <span className="font-bold text-sm sm:text-lg truncate">
                  ${liabilities.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                </span>
                <span className="text-muted-foreground text-xs sm:text-base hidden sm:inline">
                  ({liabilities.length} account{liabilities.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleAddLiability(); }}
                  className="brutalist-button h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Add Liability</span>
                </Button>
                {liabilitiesOpen ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="divide-y-2 divide-foreground">
              {liabilities.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No liabilities tracked. Add if applicable.</p>
                  <Button onClick={handleAddLiability} className="brutalist-button bg-destructive text-destructive-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Liability
                  </Button>
                </div>
              ) : (
                liabilities.map((account) => (
                  <AccountItem
                    key={account.id}
                    {...account}
                    classification="liability"
                    onEdit={account.source === 'manual' ? () => handleEditAccount(account.id) : undefined}
                    onDelete={() => handleDeleteClick({ id: account.id, name: account.name, source: account.source })}
                    onReclassify={account.source === 'plaid' ? () => updateAccountClassification(account.id, 'asset') : undefined}
                  />
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <AddManualAccountDialog
        open={addDialogOpen}
        onOpenChange={handleDialogClose}
        defaultClassification={defaultClassification}
        editAccount={editAccount}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="brutalist-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{accountToDelete?.name}"? 
              {accountToDelete?.source === 'plaid' && ' This will disconnect it from your linked bank.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="brutalist-button">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="brutalist-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountsList;