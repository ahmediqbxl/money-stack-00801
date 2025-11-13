
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Budget {
  id: string;
  category_name: string;
  budget_amount: number;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load budgets from database
  useEffect(() => {
    if (user) {
      loadBudgets();
    }
  }, [user]);

  const loadBudgets = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch budgets from database
      const { data: dbBudgets, error } = await supabase
        .from('budgets')
        .select('*')
        .order('category_name');

      if (error) throw error;

      if (dbBudgets && dbBudgets.length > 0) {
        setBudgets(dbBudgets);
      } else {
        // Check for localStorage budgets to migrate
        const storedBudgets = localStorage.getItem(`budgets_${user.id}`);
        if (storedBudgets) {
          const localBudgets = JSON.parse(storedBudgets);
          // Migrate to database
          await migrateBudgetsToDatabase(localBudgets);
          localStorage.removeItem(`budgets_${user.id}`);
        } else {
          // Initialize with default budgets
          const defaultBudgets = [
            { category_name: 'Food & Dining', budget_amount: 800, color: '#FF6B6B' },
            { category_name: 'Transportation', budget_amount: 400, color: '#4ECDC4' },
            { category_name: 'Shopping', budget_amount: 500, color: '#45B7D1' },
            { category_name: 'Entertainment', budget_amount: 300, color: '#96CEB4' },
            { category_name: 'Bills & Utilities', budget_amount: 600, color: '#FFEAA7' },
            { category_name: 'Healthcare', budget_amount: 200, color: '#DDA0DD' },
          ];
          
          const { data: insertedBudgets, error: insertError } = await supabase
            .from('budgets')
            .insert(defaultBudgets.map(b => ({ ...b, user_id: user.id })))
            .select();

          if (insertError) throw insertError;
          if (insertedBudgets) setBudgets(insertedBudgets);
        }
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast({
        title: "Error loading budgets",
        description: "Failed to load your budgets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const migrateBudgetsToDatabase = async (localBudgets: any[]) => {
    if (!user) return;
    
    try {
      const budgetsToInsert = localBudgets.map(b => ({
        user_id: user.id,
        category_name: b.category_name,
        budget_amount: b.budget_amount,
        color: b.color,
      }));

      const { data, error } = await supabase
        .from('budgets')
        .insert(budgetsToInsert)
        .select();

      if (error) throw error;
      if (data) setBudgets(data);
      
      toast({
        title: "Budgets migrated",
        description: "Your budgets have been migrated to the database.",
      });
    } catch (error) {
      console.error('Error migrating budgets:', error);
    }
  };

  const saveBudgets = async (newBudgets: Budget[]) => {
    if (!user) return;
    
    try {
      const budgetsToUpsert = newBudgets.map(b => ({
        id: b.id,
        user_id: user.id,
        category_name: b.category_name,
        budget_amount: b.budget_amount,
        color: b.color,
      }));

      const { error } = await supabase
        .from('budgets')
        .upsert(budgetsToUpsert);

      if (error) throw error;
      
      setBudgets(newBudgets);
    } catch (error) {
      console.error('Error saving budgets:', error);
      toast({
        title: "Error saving budgets",
        description: "Failed to save your budgets. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateBudget = async (budgetId: string, newAmount: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ budget_amount: newAmount })
        .eq('id', budgetId)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedBudgets = budgets.map(budget => 
        budget.id === budgetId 
          ? { ...budget, budget_amount: newAmount, updated_at: new Date().toISOString() }
          : budget
      );
      setBudgets(updatedBudgets);
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        title: "Error updating budget",
        description: "Failed to update budget. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addBudget = async (categoryName: string, amount: number) => {
    if (!user) return;
    
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: user.id,
          category_name: categoryName,
          budget_amount: amount,
          color: randomColor,
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setBudgets([...budgets, data]);
        return data;
      }
    } catch (error) {
      console.error('Error adding budget:', error);
      toast({
        title: "Error adding budget",
        description: "Failed to add budget. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getBudgetForCategory = (categoryName: string): number => {
    const budget = budgets.find(b => b.category_name.toLowerCase() === categoryName.toLowerCase());
    return budget?.budget_amount || 0;
  };

  return {
    budgets,
    isLoading,
    updateBudget,
    addBudget,
    getBudgetForCategory,
    saveBudgets
  };
};
