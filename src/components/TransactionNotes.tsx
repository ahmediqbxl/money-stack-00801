import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TransactionNotesProps {
  transactionId: string;
  currentNotes: string | null;
  description: string;
  onNotesUpdated: () => void;
}

const TransactionNotes = ({ transactionId, currentNotes, description, onNotesUpdated }: TransactionNotesProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(currentNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ notes: notes.trim() || null })
        .eq('id', transactionId);

      if (error) throw error;

      toast({
        title: "Notes saved",
        description: "Transaction notes updated successfully",
      });
      
      onNotesUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <MessageSquare className={`h-4 w-4 ${currentNotes ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transaction Notes</DialogTitle>
          <DialogDescription>
            Add notes or comments about this transaction: <span className="font-medium">{description}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your notes here..."
            className="min-h-[120px]"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {notes.length}/1000 characters
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionNotes;
