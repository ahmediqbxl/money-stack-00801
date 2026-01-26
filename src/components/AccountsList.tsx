import React, { useState } from 'react';
import { Building2, Home, Car, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
import { useNetWorth, AccountClassification, getAutoClassification } from '@/hooks/useNetWorth';
import AddManualAccountDialog from './AddManualAccountDialog';

interface AccountItemProps {
  id: string;
  name: string;
  balance: number;
  type: string;
  source: 'plaid' | 'manual';
  classification: AccountClassification;
  onEdit?: () => void;
  onDelete?: () => void;
}

const AccountItem = ({ name, balance, type, source, classification, onEdit, onDelete }: AccountItemProps) => {
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

  return (
    <div className="flex items-center justify-between p-4 border-2 border-foreground bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 flex items-center justify-center border-2 border-foreground ${
          classification === 'asset' ? 'bg-accent/20' : 'bg-destructive/20'
        }`}>
          {getIcon()}
        </div>
        <div>
          <p className="font-bold">{name}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground capitalize">{type}</span>
            {source === 'plaid' && (
              <Badge variant="outline" className="text-xs">PLAID</Badge>
            )}
            {source === 'manual' && (
              <Badge variant="outline" className="text-xs">MANUAL</Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className={`text-xl font-bold font-display ${
          classification === 'asset' ? 'text-accent' : 'text-destructive'
        }`}>
          ${balance.toLocaleString()}
        </span>
        
        <div className="flex gap-1">
          {source === 'manual' && onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
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
  
  const { accountsByClassification, deleteManualAccount, deletePlaidAccount, manualAccounts } = useNetWorth();
  const { assets, liabilities } = accountsByClassification;

  const handleAddAsset = () => {
    setDefaultClassification('asset');
    setAddDialogOpen(true);
  };

  const handleAddLiability = () => {
    setDefaultClassification('liability');
    setAddDialogOpen(true);
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

  return (
    <div className="space-y-6">
      {/* Assets Section */}
      <Collapsible open={assetsOpen} onOpenChange={setAssetsOpen}>
        <div className="brutalist-card">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 border-b-2 border-foreground cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="badge-asset">ASSETS</div>
                <span className="font-bold text-lg">
                  ${assets.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  ({assets.length} account{assets.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleAddAsset(); }}
                  className="brutalist-button h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Asset
                </Button>
                {assetsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                    onDelete={() => handleDeleteClick({ id: account.id, name: account.name, source: account.source })}
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
            <div className="flex items-center justify-between p-4 border-b-2 border-foreground cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="badge-liability">LIABILITIES</div>
                <span className="font-bold text-lg">
                  ${liabilities.reduce((sum, a) => sum + a.balance, 0).toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  ({liabilities.length} account{liabilities.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleAddLiability(); }}
                  className="brutalist-button h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Liability
                </Button>
                {liabilitiesOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                    onDelete={() => handleDeleteClick({ id: account.id, name: account.name, source: account.source })}
                  />
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <AddManualAccountDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultClassification={defaultClassification}
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
