import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PiggyBank, TrendingUp, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SavingsGoalProps {
  transactions: Array<{
    amount: number;
    date: string;
  }>;
}

const SavingsGoal = ({ transactions }: SavingsGoalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate current month's net income
  const currentMonthSavings = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const income = monthlyTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthlyTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return Math.round((income - expenses) * 100) / 100;
  }, [transactions]);

  // Load savings goal from preferences
  useEffect(() => {
    if (!user?.id) return;

    const loadSavingsGoal = async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading savings goal:', error);
        return;
      }

      if (data?.preferences && typeof data.preferences === 'object' && 'savingsGoal' in data.preferences) {
        setSavingsGoal(Number(data.preferences.savingsGoal) || 0);
      }
    };

    loadSavingsGoal();
  }, [user?.id]);

  const handleSave = async () => {
    const newGoal = parseFloat(editValue);
    if (isNaN(newGoal) || newGoal < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid savings goal.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // First, check if preferences exist
    const { data: existingData } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user?.id)
      .maybeSingle();

    const currentPreferences = (existingData?.preferences && typeof existingData.preferences === 'object') 
      ? existingData.preferences as Record<string, any>
      : {};

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user?.id,
        preferences: {
          ...currentPreferences,
          savingsGoal: newGoal
        }
      }, {
        onConflict: 'user_id'
      });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update savings goal.",
        variant: "destructive",
      });
      return;
    }

    setSavingsGoal(newGoal);
    setIsEditing(false);
    setEditValue('');

    toast({
      title: "Savings Goal Updated",
      description: `Your monthly savings goal is now $${newGoal.toFixed(2)}.`,
    });
  };

  const progressPercentage = savingsGoal > 0 ? Math.min((currentMonthSavings / savingsGoal) * 100, 100) : 0;
  const isOnTrack = currentMonthSavings >= savingsGoal && savingsGoal > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Monthly Savings Goal
          </span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                setEditValue(savingsGoal.toString());
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Track your progress toward your monthly savings target
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter savings goal"
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isLoading} className="flex-1">
                Save Goal
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditValue('');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="text-2xl font-bold">${savingsGoal.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Savings</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  ${currentMonthSavings.toFixed(2)}
                  {isOnTrack && savingsGoal > 0 && (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  )}
                </p>
              </div>
            </div>

            {savingsGoal > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className={isOnTrack ? "text-green-500" : "text-muted-foreground"}>
                    {progressPercentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}

            {savingsGoal === 0 && (
              <p className="text-sm text-muted-foreground">
                Click the edit button to set your monthly savings goal
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SavingsGoal;
