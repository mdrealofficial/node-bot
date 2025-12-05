import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  order_id: string;
  transaction_type: 'payment' | 'refund';
  amount: number;
  payment_method: string;
  payment_id: string | null;
  status: string;
  metadata: any;
  created_at: string;
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'payment' | 'refund'>('all');
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    loadStoreAndTransactions();
  }, []);

  const loadStoreAndTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (store) {
        setStoreId(store.id);
        await loadTransactions(store.id);
      }
    } catch (error) {
      console.error('Error loading store:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (store_id: string) => {
    const query = supabase
      .from('payment_transactions')
      .select('*')
      .eq('store_id', store_id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query.eq('transaction_type', filter);
    }

    const { data, error } = await query;

    if (error) {
      if ((error as any).code === '42501') {
        console.warn('TransactionHistory: permission denied for payment_transactions, showing empty list');
      } else {
        console.error('Error loading transactions:', error);
        toast.error('Failed to load transactions');
      }
      return;
    }

    setTransactions((data || []) as Transaction[]);
  };

  useEffect(() => {
    if (storeId) {
      loadTransactions(storeId);
    }
  }, [filter]);

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => {
      if (t.transaction_type === 'payment') return sum + Number(t.amount);
      if (t.transaction_type === 'refund') return sum - Number(t.amount);
      return sum;
    }, 0);
  };

  const getFilteredStats = () => {
    const payments = transactions.filter(t => t.transaction_type === 'payment');
    const refunds = transactions.filter(t => t.transaction_type === 'refund');
    
    return {
      totalPayments: payments.reduce((sum, t) => sum + Number(t.amount), 0),
      totalRefunds: refunds.reduce((sum, t) => sum + Number(t.amount), 0),
      paymentCount: payments.length,
      refundCount: refunds.length,
    };
  };

  const stats = getFilteredStats();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">৳{stats.totalPayments.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{stats.paymentCount} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">৳{stats.totalRefunds.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{stats.refundCount} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{getTotalAmount().toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All payment activities for your store</CardDescription>
            </div>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="payment">Payments Only</SelectItem>
                <SelectItem value="refund">Refunds Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {transaction.transaction_type === 'payment' ? (
                          <>
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">Payment</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-medium">Refund</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {transaction.order_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.payment_method.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {transaction.payment_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={transaction.status === 'success' ? 'default' : 'destructive'}
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={transaction.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.transaction_type === 'payment' ? '+' : '-'}৳{Number(transaction.amount).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
