
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, Edit, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { usePlaidData } from '@/hooks/usePlaidData';
import { useDatabase } from '@/hooks/useDatabase';

const TransactionManager = () => {
  const { transactions, isLoading } = usePlaidData();
  const { updateTransactionCategory } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [isOpen, setIsOpen] = useState(true);

  // Available categories for manual assignment
  const availableCategories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Income',
    'Other'
  ];

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(transactions.map(t => t.category_name).filter(Boolean))];
    return ['all', ...uniqueCategories];
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.merchant && transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || transaction.category_name === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'amount':
          return Math.abs(b.amount) - Math.abs(a.amount);
        case 'description':
          return a.description.localeCompare(b.description);
        default:
          return 0;
      }
    });

    return filtered;
  }, [transactions, searchTerm, selectedCategory, sortBy]);

  const handleCategoryChange = async (transactionId: string, newCategory: string) => {
    try {
      await updateTransactionCategory(transactionId, newCategory);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading transactions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <CardTitle>Transaction Manager</CardTitle>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CardDescription>
              Search, organize, and categorize your transactions
            </CardDescription>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions by description or merchant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="description">Description</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>
            {(searchTerm || selectedCategory !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transactions • Click on categories to edit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {transaction.merchant || '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={transaction.category_name || 'Other'}
                        onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {transaction.amount > 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Transaction
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search terms or category filters
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default TransactionManager;
