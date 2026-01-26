import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useNetWorth, AccountClassification } from '@/hooks/useNetWorth';

interface AddManualAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClassification?: AccountClassification;
}

const ASSET_TYPES = [
  'Real Estate',
  'Vehicle',
  'Savings',
  'Investment',
  'Retirement (401k/IRA)',
  'Cash',
  'Cryptocurrency',
  'Collectibles',
  'Business Equity',
  'Other Asset',
];

const LIABILITY_TYPES = [
  'Mortgage',
  'Auto Loan',
  'Student Loan',
  'Personal Loan',
  'Credit Card',
  'Medical Debt',
  'Business Loan',
  'Other Debt',
];

const AddManualAccountDialog = ({ 
  open, 
  onOpenChange, 
  defaultClassification = 'asset' 
}: AddManualAccountDialogProps) => {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [classification, setClassification] = useState<AccountClassification>(defaultClassification);
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addManualAccount } = useNetWorth();

  const accountTypes = classification === 'asset' ? ASSET_TYPES : LIABILITY_TYPES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !accountType || !balance) return;

    setIsSubmitting(true);
    
    await addManualAccount({
      name: name.trim(),
      account_type: accountType,
      classification,
      balance: parseFloat(balance) || 0,
      currency: 'USD',
      notes: notes.trim() || undefined,
    });

    // Reset form
    setName('');
    setAccountType('');
    setBalance('');
    setNotes('');
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleClassificationChange = (value: AccountClassification) => {
    setClassification(value);
    setAccountType(''); // Reset account type when classification changes
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brutalist-card border-4 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-black">
            Add {classification === 'asset' ? 'Asset' : 'Liability'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Classification Toggle */}
          <div className="space-y-2">
            <Label className="font-bold uppercase text-xs tracking-wider">Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={classification === 'asset' ? 'default' : 'outline'}
                className={`flex-1 brutalist-button ${classification === 'asset' ? 'bg-accent text-accent-foreground' : ''}`}
                onClick={() => handleClassificationChange('asset')}
              >
                Asset
              </Button>
              <Button
                type="button"
                variant={classification === 'liability' ? 'default' : 'outline'}
                className={`flex-1 brutalist-button ${classification === 'liability' ? 'bg-destructive text-destructive-foreground' : ''}`}
                onClick={() => handleClassificationChange('liability')}
              >
                Liability
              </Button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold uppercase text-xs tracking-wider">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={classification === 'asset' ? 'e.g., Primary Home' : 'e.g., Mortgage'}
              className="border-2 border-foreground"
              required
            />
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label className="font-bold uppercase text-xs tracking-wider">Category</Label>
            <Select value={accountType} onValueChange={setAccountType} required>
              <SelectTrigger className="border-2 border-foreground">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance" className="font-bold uppercase text-xs tracking-wider">
              {classification === 'asset' ? 'Current Value' : 'Amount Owed'}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold">$</span>
              <Input
                id="balance"
                type="number"
                step="0.01"
                min="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="pl-8 border-2 border-foreground"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="font-bold uppercase text-xs tracking-wider">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              className="border-2 border-foreground min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="brutalist-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !accountType || !balance}
              className={`brutalist-button ${
                classification === 'asset' 
                  ? 'bg-accent text-accent-foreground' 
                  : 'bg-destructive text-destructive-foreground'
              }`}
            >
              {isSubmitting ? 'Adding...' : 'Add Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddManualAccountDialog;
