import React, { useState, useEffect } from 'react';
import { Target, Plus, Check, Calendar, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNetWorth, NetWorthGoal } from '@/hooks/useNetWorth';

const GoalsSection = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<NetWorthGoal | null>(null);
  const [editGoal, setEditGoal] = useState<NetWorthGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { goals, calculateNetWorth, addGoal, updateGoal, deleteGoal } = useNetWorth();
  const { netWorth } = calculateNetWorth();

  const isEditMode = !!editGoal;

  // Reset form when dialog opens/closes or when switching between add/edit
  useEffect(() => {
    if (editGoal) {
      setGoalName(editGoal.goal_name);
      setTargetAmount(editGoal.target_amount.toString());
      setTargetDate(editGoal.target_date || '');
      setDescription(editGoal.description || '');
    } else {
      setGoalName('');
      setTargetAmount('');
      setTargetDate('');
      setDescription('');
    }
  }, [editGoal, dialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !targetAmount) return;

    setIsSubmitting(true);
    
    if (isEditMode && editGoal) {
      await updateGoal(editGoal.id, {
        goal_name: goalName.trim(),
        target_amount: parseFloat(targetAmount),
        target_date: targetDate || undefined,
        description: description.trim() || undefined,
      });
    } else {
      await addGoal({
        goal_name: goalName.trim(),
        target_amount: parseFloat(targetAmount),
        target_date: targetDate || undefined,
        description: description.trim() || undefined,
      });
    }

    setGoalName('');
    setTargetAmount('');
    setTargetDate('');
    setDescription('');
    setEditGoal(null);
    setIsSubmitting(false);
    setDialogOpen(false);
  };

  const handleAddClick = () => {
    setEditGoal(null);
    setDialogOpen(true);
  };

  const handleEditClick = (goal: NetWorthGoal) => {
    setEditGoal(goal);
    setDialogOpen(true);
  };

  const handleDeleteClick = (goal: NetWorthGoal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (goalToDelete) {
      await deleteGoal(goalToDelete.id);
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditGoal(null);
    }
  };

  const getProgress = (targetAmount: number) => {
    if (targetAmount <= 0) return 100;
    return Math.min(100, Math.max(0, (netWorth / targetAmount) * 100));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-black text-xl uppercase tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6" />
          Goals
        </h3>
        <Button 
          onClick={handleAddClick}
          className="brutalist-button bg-secondary text-secondary-foreground"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="brutalist-card p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-bold mb-2">No goals set yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Set a net worth goal to track your progress
          </p>
          <Button 
            onClick={handleAddClick}
            className="brutalist-button bg-secondary text-secondary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Set Your First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = getProgress(goal.target_amount);
            const isAchieved = goal.is_achieved || netWorth >= goal.target_amount;

            return (
              <div 
                key={goal.id} 
                className={`brutalist-card p-4 ${isAchieved ? 'bg-accent/20' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{goal.goal_name}</h4>
                      {isAchieved && (
                        <div className="badge-asset flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          ACHIEVED
                        </div>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {goal.target_date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDate(goal.target_date)}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditClick(goal)} 
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Goal</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteClick(goal)} 
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Goal</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${netWorth.toLocaleString()} of ${goal.target_amount.toLocaleString()}
                    </span>
                    <span className="font-bold">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-4 bg-muted border-2 border-foreground overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isAchieved ? 'bg-accent' : 'bg-primary'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {!isAchieved && goal.target_amount > netWorth && (
                    <p className="text-sm text-muted-foreground">
                      ${(goal.target_amount - netWorth).toLocaleString()} to go
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="brutalist-card border-4 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black">
              {isEditMode ? 'Edit Goal' : 'Set Net Worth Goal'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goalName" className="font-bold uppercase text-xs tracking-wider">
                Goal Name
              </Label>
              <Input
                id="goalName"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., First $100K"
                className="border-2 border-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAmount" className="font-bold uppercase text-xs tracking-wider">
                Target Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold">$</span>
                <Input
                  id="targetAmount"
                  type="number"
                  step="1000"
                  min="0"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="100000"
                  className="pl-8 border-2 border-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate" className="font-bold uppercase text-xs tracking-wider">
                Target Date (Optional)
              </Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="border-2 border-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-bold uppercase text-xs tracking-wider">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why this goal matters to you..."
                className="border-2 border-foreground min-h-[80px]"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                className="brutalist-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !goalName.trim() || !targetAmount}
                className="brutalist-button bg-secondary text-secondary-foreground"
              >
                {isSubmitting 
                  ? (isEditMode ? 'Saving...' : 'Creating...') 
                  : (isEditMode ? 'Save Changes' : 'Create Goal')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="brutalist-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{goalToDelete?.goal_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="brutalist-button">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="brutalist-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalsSection;