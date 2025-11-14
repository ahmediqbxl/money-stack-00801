import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category_name?: string | null;
  merchant?: string | null;
  date: string;
}

interface CategoryTransactionsProps {
  transactions: Transaction[];
}

const CategoryTransactions = ({ transactions }: CategoryTransactionsProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group transactions by category
  const transactionsByCategory = transactions
    .filter(t => t.amount < 0) // Only expenses
    .reduce((acc, transaction) => {
      const category = transaction.category_name || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

  // Calculate totals and sort by spending
  const categoryData = Object.entries(transactionsByCategory)
    .map(([category, txns]) => ({
      category,
      transactions: txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      total: txns.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      count: txns.length
    }))
    .sort((a, b) => b.total - a.total);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const categoryColors: Record<string, string> = {
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

  if (categoryData.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Category Transactions</CardTitle>
          <CardDescription>View transactions by spending category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p>No transactions available</p>
            <p className="text-sm">Connect your accounts to see categorized transactions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Category Transactions</CardTitle>
        <CardDescription>View transactions by spending category</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categoryData.map(({ category, transactions: txns, total, count }) => (
          <div key={category} className="border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className="w-full justify-between p-4 hover:bg-gray-50"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: categoryColors[category] || '#95A5A6' }}
                />
                <div className="text-left">
                  <div className="font-medium">{category}</div>
                  <div className="text-sm text-gray-500">{count} transactions</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-semibold">${total.toFixed(2)}</span>
                {expandedCategories.has(category) ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </Button>
            
            {expandedCategories.has(category) && (
              <div className="border-t bg-gray-50">
                <div className="max-h-96 overflow-y-auto">
                  {txns.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-white"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {transaction.merchant || transaction.description}
                        </div>
                        {transaction.merchant && transaction.merchant !== transaction.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {transaction.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="font-semibold text-red-600 ml-4">
                        -${Math.abs(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CategoryTransactions;
