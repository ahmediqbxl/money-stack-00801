
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Target, TrendingUp, AlertTriangle, Plus, Brain } from 'lucide-react';
import { useDatabase } from '@/hooks/useDatabase';
import { useBudgets } from '@/hooks/useBudgets';
import { supabase } from '@/integrations/supabase/client';

const BudgetSettings = () => {
  const { toast } = useToast();
  const { transactions } = useDatabase();
  const { budgets, updateBudget, addBudget, saveBudgets } = useBudgets();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isGeneratingBudgets, setIsGeneratingBudgets] = useState(false);
  
  // New category dialog state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBudget, setNewCategoryBudget] = useState<string>('');

  // Calculate spending for each budget category
  const getBudgetsWithSpending = () => {
    return budgets.map(budget => {
      const spent = transactions
        .filter(t => t.amount < 0 && t.category_name?.toLowerCase() === budget.category_name.toLowerCase())
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      return {
        ...budget,
        spent: Math.round(spent * 100) / 100
      };
    });
  };

  const budgetsWithSpending = getBudgetsWithSpending();

  const handleEditBudget = (id: string, currentBudget: number) => {
    setEditingId(id);
    setEditValue(currentBudget.toString());
  };

  const handleSaveBudget = (id: string) => {
    const newBudget = parseFloat(editValue);
    if (isNaN(newBudget) || newBudget <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please enter a valid budget amount.",
        variant: "destructive",
      });
      return;
    }

    updateBudget(id, newBudget);
    setEditingId(null);
    setEditValue('');

    toast({
      title: "Budget Updated",
      description: "Your budget has been successfully updated.",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Invalid Category",
        description: "Please enter a category name.",
        variant: "destructive",
      });
      return;
    }

    const budget = parseFloat(newCategoryBudget);
    if (isNaN(budget) || budget <= 0) {
      toast({
        title: "Invalid Budget",
        description: "Please enter a valid budget amount.",
        variant: "destructive",
      });
      return;
    }

    // Check if category already exists
    if (budgets.some(b => b.category_name.toLowerCase() === newCategoryName.toLowerCase())) {
      toast({
        title: "Category Exists",
        description: "A category with this name already exists.",
        variant: "destructive",
      });
      return;
    }

    const newBudget = await addBudget(newCategoryName.trim(), budget);
    setNewCategoryName('');
    setNewCategoryBudget('');
    setIsAddCategoryOpen(false);

    if (newBudget) {
      toast({
        title: "Category Added",
        description: `${newBudget.category_name} category has been created with a budget of $${budget}.`,
      });
    }
  };

  const handleGenerateBudgets = async () => {
    setIsGeneratingBudgets(true);
    
    try {
      // Calculate spending data from transactions
      const categorySpending: { [key: string]: number } = {};
      transactions.forEach(transaction => {
        const category = transaction.category_name || 'Other';
        const amount = Math.abs(transaction.amount);
        categorySpending[category] = (categorySpending[category] || 0) + amount;
      });

      const totalSpent = Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0);
      
      // Prepare data for GPT
      const spendingData = Object.entries(categorySpending)
        .map(([category, amount]) => `${category}: $${amount.toFixed(2)}`)
        .join(', ');

      const { data, error } = await supabase.functions.invoke('generate-budget-allocation', {
        body: {
          totalSpent,
          categorySpending,
          currentBudgets: budgets.map(b => ({ name: b.category_name, budget: b.budget_amount, spent: budgetsWithSpending.find(bs => bs.id === b.id)?.spent || 0 })),
          spendingData
        }
      });

      if (error) throw error;

      const allocatedBudgets = data.budgetAllocation;
      
      // Update budgets with GPT recommendations
      const updatedBudgets = budgets.map(budget => {
        const allocation = allocatedBudgets.find((a: any) => 
          a.category.toLowerCase() === budget.category_name.toLowerCase()
        );
        return allocation ? { ...budget, budget_amount: allocation.recommendedBudget, updated_at: new Date().toISOString() } : budget;
      });

      saveBudgets(updatedBudgets);
      
      toast({
        title: "Budgets Allocated",
        description: "GPT has analyzed your spending and allocated optimized budgets.",
      });

    } catch (error) {
      console.error('Budget generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate budget allocation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBudgets(false);
    }
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.budget_amount, 0);
  const totalSpent = budgetsWithSpending.reduce((sum, budget) => sum + budget.spent, 0);

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-blue-100">Monthly budget set</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
            <p className="text-xs text-green-100">This month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((totalSpent / totalBudget) * 100)}%</div>
            <p className="text-xs text-purple-100">Of budget used</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Category Budgets</CardTitle>
          <CardDescription>
            Set and manage your monthly spending budgets for each category
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {budgetsWithSpending.map((budget) => {
            const percentage = (budget.spent / budget.budget_amount) * 100;
            const isOverBudget = budget.spent > budget.budget_amount;
            
            return (
              <div key={budget.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: budget.color }}
                    ></div>
                    <div>
                      <p className="font-medium">{budget.category_name}</p>
                      <p className="text-sm text-gray-500">
                        ${budget.spent.toLocaleString()} spent of ${budget.budget_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isOverBudget && (
                      <Badge variant="destructive" className="flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Over budget</span>
                      </Badge>
                    )}
                    
                    {editingId === budget.id ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 h-8"
                          placeholder="Budget"
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveBudget(budget.id)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditBudget(budget.id, budget.budget_amount)}
                      >
                        Edit Budget
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{percentage.toFixed(1)}% used</span>
                    {isOverBudget && (
                      <span className="text-red-500">
                        ${(budget.spent - budget.budget_amount).toLocaleString()} over
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common budget management actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-auto p-4 text-left">
                  <div className="flex items-center space-x-3">
                    <Plus className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Add New Category</p>
                      <p className="text-sm text-gray-500">Create a budget for a new spending category</p>
                    </div>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                  <DialogDescription>
                    Create a new spending category with a monthly budget.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Gym & Fitness"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryBudget">Monthly Budget</Label>
                    <Input
                      id="categoryBudget"
                      type="number"
                      value={newCategoryBudget}
                      onChange={(e) => setNewCategoryBudget(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddCategory}>
                      Add Category
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 text-left"
              onClick={handleGenerateBudgets}
              disabled={isGeneratingBudgets}
            >
              <div className="flex items-center space-x-3">
                <Brain className={`w-5 h-5 text-purple-500 ${isGeneratingBudgets ? 'animate-pulse' : ''}`} />
                <div>
                  <p className="font-medium">
                    {isGeneratingBudgets ? 'Generating...' : 'AI Budget Allocation'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {isGeneratingBudgets ? 'Analyzing your spending patterns' : 'Let GPT optimize your budget based on spending patterns'}
                  </p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetSettings;
