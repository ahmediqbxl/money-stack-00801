import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, CreditCard, PiggyBank, AlertTriangle, Lightbulb, Target, LogOut, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import FlinksConnect from "@/components/FlinksConnect";
import ConnectedAccounts from "@/components/ConnectedAccounts";
import AITransactionAnalysis from "@/components/AITransactionAnalysis";
import TransactionManager from "@/components/TransactionManager";
import BudgetSettings from "@/components/BudgetSettings";
import { usePlaidData } from "@/hooks/usePlaidData";
import AIInsights from "@/components/AIInsights";
import CategoryTransactions from "@/components/CategoryTransactions";

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { transactions, accounts } = usePlaidData();

  // Dynamic monthly spending data from actual transactions
  const monthlySpending = useMemo(() => {
    if (transactions.length === 0) {
      return [];
    }

    // Group transactions by month
    const monthlyData: { [key: string]: number } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    transactions.forEach(transaction => {
      if (transaction.amount < 0) { // Only expenses
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += Math.abs(transaction.amount);
      }
    });

    // Convert to chart format and get last 6 months
    const sortedMonths = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, amount]) => {
        const [year, monthIndex] = key.split('-');
        return {
          month: monthNames[parseInt(monthIndex)],
          amount: Math.round(amount),
          budget: 0 // Will be set when budgets are implemented
        };
      });

    return sortedMonths;
  }, [transactions]);

  // Daily spending pattern for the last 30 days
  const dailySpending = useMemo(() => {
    if (transactions.length === 0) {
      return [];
    }

    // Get last 30 days of spending
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyData: { [key: string]: number } = {};

    transactions.forEach(transaction => {
      if (transaction.amount < 0) { // Only expenses
        const transactionDate = new Date(transaction.date);
        if (transactionDate >= thirtyDaysAgo) {
          const dayKey = transactionDate.toISOString().split('T')[0];
          if (!dailyData[dayKey]) {
            dailyData[dayKey] = 0;
          }
          dailyData[dayKey] += Math.abs(transaction.amount);
        }
      }
    });

    // Convert to chart format
    const sortedDays = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        day: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: Math.round(amount)
      }));

    return sortedDays;
  }, [transactions]);

  // Dynamic category data from actual transactions
  const categoryData = useMemo(() => {
    const categoryColors = {
      'Food & Dining': '#FF6B6B',
      'Transportation': '#4ECDC4',
      'Shopping': '#45B7D1',
      'Entertainment': '#96CEB4',
      'Bills & Utilities': '#FFEAA7',
      'Healthcare': '#DDA0DD',
      'Income': '#2ECC71',
      'Transfer': '#95A5A6',
      'Other': '#E74C3C'
    };

    // Calculate spending by category from actual transactions
    const categorySpending: { [key: string]: number } = {};
    
    transactions.forEach(transaction => {
      // Only count expenses (negative amounts)
      if (transaction.amount < 0) {
        const category = transaction.category_name || 'Other';
        const amount = Math.abs(transaction.amount);
        categorySpending[category] = (categorySpending[category] || 0) + amount;
      }
    });

    // Convert to array format for the chart, only include categories with spending
    return Object.entries(categorySpending)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100, // Round to 2 decimal places
        color: categoryColors[name as keyof typeof categoryColors] || '#95A5A6',
        budget: 0 // Will be set when budgets are implemented
      }))
      .sort((a, b) => b.value - a.value); // Sort by spending amount
  }, [transactions]);

  // Calculate spending totals first (needed for other calculations)
  const totalSpent = categoryData.reduce((sum, cat) => sum + cat.value, 0);
  const totalBudget = categoryData.reduce((sum, cat) => sum + cat.budget, 0);

  // Calculate potential savings dynamically from spending patterns
  const potentialSavings = useMemo(() => {
    if (transactions.length === 0) return 0;

    let savings = 0;
    
    // Calculate savings from high-frequency small transactions (like coffee, fast food)
    const smallTransactions = transactions.filter(t => 
      t.amount < 0 && Math.abs(t.amount) < 20 && 
      (t.category_name?.toLowerCase().includes('food') || 
       t.category_name?.toLowerCase().includes('coffee') ||
       t.description?.toLowerCase().includes('coffee') ||
       t.description?.toLowerCase().includes('fast food'))
    );
    
    if (smallTransactions.length > 0) {
      const dailySmallSpending = smallTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / 30;
      savings += dailySmallSpending * 0.3 * 30; // 30% reduction potential
    }

    // Add potential from top spending category optimization
    if (categoryData.length > 0) {
      savings += categoryData[0].value * 0.15; // 15% of top category
    }

    // Add savings from subscription optimization
    const subscriptions = transactions.filter(t =>
      t.amount < 0 && 
      (t.description?.toLowerCase().includes('subscription') ||
       t.description?.toLowerCase().includes('netflix') ||
       t.description?.toLowerCase().includes('spotify') ||
       t.description?.toLowerCase().includes('amazon'))
    );
    
    if (subscriptions.length > 0) {
      savings += subscriptions.reduce((sum, t) => sum + Math.abs(t.amount), 0) * 0.2; // 20% potential
    }
    
    return Math.round(savings);
  }, [transactions, categoryData]);

  // Sample recent transactions (keeping this for fallback when no real data)
  const recentTransactions = [
    { id: 1, merchant: 'Whole Foods', amount: -67.43, category: 'Food & Dining', date: '2024-05-23', type: 'debit' },
    { id: 2, merchant: 'Uber', amount: -23.50, category: 'Transportation', date: '2024-05-22', type: 'credit' },
    { id: 3, merchant: 'Netflix', amount: -15.99, category: 'Entertainment', date: '2024-05-22', type: 'debit' },
    { id: 4, merchant: 'Target', amount: -89.24, category: 'Shopping', date: '2024-05-21', type: 'debit' },
    { id: 5, merchant: 'Salary Deposit', amount: 4200.00, category: 'Income', date: '2024-05-20', type: 'deposit' },
  ];

  const aiInsights = [
    {
      type: 'savings',
      title: 'Coffee Shop Optimization',
      description: 'You spend $127/month on coffee. Making coffee at home 3 days a week could save you $45/month.',
      potential: 540,
      difficulty: 'Easy'
    },
    {
      type: 'budget',
      title: 'Shopping Budget Exceeded',
      description: 'Your shopping spending is 36% over budget. Consider setting spending alerts.',
      potential: 180,
      difficulty: 'Medium'
    },
    {
      type: 'investment',
      title: 'Emergency Fund Goal',
      description: 'You have $2,400 in checking. Consider moving $1,000 to a high-yield savings account.',
      potential: 48,
      difficulty: 'Easy'
    }
  ];

  const handleConnectBank = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      toast({
        title: "Demo Mode",
        description: "This is a demo. To connect real banks, you'll need to integrate with services like Plaid through our Supabase backend integration.",
      });
    }, 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You've been successfully signed out.",
    });
  };

  // Dynamic calculations for overview cards
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const connectedAccountsCount = accounts.length;
  const budgetHealthPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  
  // Calculate account type breakdown
  const accountTypes = accounts.reduce((acc, account) => {
    const type = account.account_type.toLowerCase();
    if (type.includes('checking') || type.includes('chequing')) {
      acc.checking = (acc.checking || 0) + 1;
    } else if (type.includes('credit')) {
      acc.credit = (acc.credit || 0) + 1;
    } else if (type.includes('saving')) {
      acc.savings = (acc.savings || 0) + 1;
    } else {
      acc.other = (acc.other || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Generate account breakdown text
  const getAccountBreakdown = () => {
    if (connectedAccountsCount === 0) return "No accounts connected";
    
    const parts = [];
    if (accountTypes.checking) parts.push(`${accountTypes.checking} checking`);
    if (accountTypes.savings) parts.push(`${accountTypes.savings} savings`);
    if (accountTypes.credit) parts.push(`${accountTypes.credit} credit`);
    if (accountTypes.other) parts.push(`${accountTypes.other} other`);
    
    return parts.join(", ") || "Connected accounts";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header with user info */}
        <div className="flex justify-between items-center">
          <div className="text-center flex-1 space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent leading-tight py-2">
              MoneyStack
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Connect your accounts and let AI analyze your spending to find personalized savings opportunities
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Connected Accounts Section */}
        <div className="max-w-4xl mx-auto">
          <ConnectedAccounts />
        </div>

        {/* AI Analysis Section */}
        <div className="max-w-4xl mx-auto">
          <AITransactionAnalysis />
        </div>

        {/* Overview Cards - Now Dynamic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
              <p className="text-xs text-blue-100">
                {totalBudget > 0 && (
                  <>
                    ${totalBudget - totalSpent > 0 ? '+' : ''}${(totalBudget - totalSpent).toLocaleString()} vs budget
                  </>
                )}
                {totalBudget === 0 && transactions.length > 0 && "From connected accounts"}
                {totalBudget === 0 && transactions.length === 0 && "No spending data"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
              <PiggyBank className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${potentialSavings}/month</div>
              <p className="text-xs text-green-100">
                {transactions.length > 0 ? "Based on spending patterns" : "Connect accounts to analyze"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Health</CardTitle>
              <Target className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{budgetHealthPercentage}%</div>
              <p className="text-xs text-purple-100">
                {totalBudget > 0 ? "of monthly budget used" : "No budget set"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts Connected</CardTitle>
              <CreditCard className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedAccountsCount}</div>
              <p className="text-xs text-orange-100">
                {getAccountBreakdown()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dynamic Spending by Category */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                  <CardDescription>
                    {categoryData.length > 0 
                      ? `Current month breakdown from ${transactions.length} transactions`
                      : "Connect your accounts to see spending breakdown"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryData.length > 0 ? (
                    <>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={120}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {categoryData.map((category, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <span className="text-sm text-gray-600 truncate">
                              {category.name} (${category.value})
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <PiggyBank className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No spending data available</p>
                        <p className="text-sm">Connect your accounts to see your spending breakdown</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Budget Progress */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Budget Progress</CardTitle>
                  <CardDescription>How you're tracking this month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryData.length > 0 ? (
                    categoryData.map((category, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{category.name}</span>
                          <span className="text-gray-500">
                            ${category.value} / ${category.budget || 'No budget'}
                          </span>
                        </div>
                        {category.budget > 0 && (
                          <>
                            <Progress 
                              value={(category.value / category.budget) * 100} 
                              className="h-2"
                            />
                            {category.value > category.budget && (
                              <p className="text-xs text-red-500 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Over budget by ${(category.value - category.budget).toFixed(2)}
                              </p>
                            )}
                          </>
                        )}
                        {category.budget === 0 && (
                          <div className="text-xs text-gray-400">No budget set for this category</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No spending data to track</p>
                      <p className="text-sm">Connect accounts to see budget progress</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Transactions - Full Width */}
            <div className="mt-6">
              <CategoryTransactions transactions={transactions} />
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionManager />
          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <BudgetSettings />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <AIInsights 
              transactions={transactions}
              categoryData={categoryData}
              totalSpent={totalSpent}
            />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Monthly Spending Trends</CardTitle>
                  <CardDescription>
                    {transactions.length > 0 
                      ? `Spending trends from your ${transactions.length} transactions`
                      : "Connect your accounts to see real trends"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlySpending.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlySpending}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value}`, '']} />
                          <Bar dataKey="amount" fill="#3B82F6" name="Actual" />
                          {monthlySpending.some(m => m.budget > 0) && (
                            <Bar dataKey="budget" fill="#E5E7EB" name="Budget" />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-80 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No spending data available</p>
                        <p className="text-sm">Connect your accounts to see spending trends</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Daily Spending Pattern</CardTitle>
                  <CardDescription>
                    {transactions.length > 0 
                      ? "Daily spending over the last 30 days from your transactions"
                      : "Connect your accounts to see real daily patterns"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dailySpending.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailySpending}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                          <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#10B981" 
                            strokeWidth={3}
                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <TrendingDown className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No daily spending data available</p>
                        <p className="text-sm">Connect your accounts to see daily patterns</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
