import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { resellerGetTransactions } from "@/lib/api";
import { ArrowDown, ArrowUp } from "lucide-react";

interface Transaction {
  id: number;
  amount: number | string;
  balance_after: number | string;
  transaction_type: string;
  description?: string;
  created_at: string;
}

export default function ResellerTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        console.log("ResellerTransactions: Fetching transactions...");
        const data = await resellerGetTransactions();
        console.log("ResellerTransactions: Data received", data);
        setTransactions(data);
        setError(null);
      } catch (err: any) {
        console.error("ResellerTransactions: Error", err);
        const errorMsg = err.message || "Failed to load transactions";
        setError(errorMsg);
        toast({
          title: "Failed to load transactions",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "admin_assign":
      case "topup_approved":
        return "bg-green-500/20 text-green-500";
      case "admin_deduct":
      case "usage":
        return "bg-red-500/20 text-red-500";
      case "refund":
        return "bg-blue-500/20 text-blue-500";
      default:
        return "bg-muted";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "admin_assign":
      case "topup_approved":
      case "refund":
        return <ArrowDown className="h-4 w-4" />;
      case "admin_deduct":
      case "usage":
        return <ArrowUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "admin_assign":
        return "Admin Assign";
      case "topup_approved":
        return "Topup Approved";
      case "admin_deduct":
        return "Admin Deduct";
      case "usage":
        return "License Usage";
      case "refund":
        return "Refund";
      default:
        return type;
    }
  };

  const columns = [
    {
      key: "type",
      header: "Type",
      render: (tx: Transaction) => (
        <Badge className={getTypeColor(tx.transaction_type)}>
          <div className="flex items-center gap-1">
            {getTypeIcon(tx.transaction_type)}
            {getTypeLabel(tx.transaction_type)}
          </div>
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (tx: Transaction) => (
        <p className="text-sm">{tx.description || "—"}</p>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (tx: Transaction) => (
        <span
          className={`font-medium ${
            ['admin_assign', 'topup_approved', 'refund'].includes(tx.transaction_type)
              ? "text-green-500"
              : "text-red-500"
          }`}
        >
          {['admin_assign', 'topup_approved', 'refund'].includes(tx.transaction_type) ? "+" : "-"}
          {Math.abs(typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount).toFixed(2)}
        </span>
      ),
    },
    {
      key: "balance_after",
      header: "Balance After",
      render: (tx: Transaction) => (
        <span className="font-medium">{typeof tx.balance_after === 'string' ? tx.balance_after : tx.balance_after.toFixed(2)}</span>
      ),
    },
    {
      key: "created_at",
      header: "Date",
      render: (tx: Transaction) =>
        new Date(tx.created_at).toLocaleDateString(),
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Transactions" subtitle="View your transaction history">
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Transactions" subtitle="View your transaction history">
        <div className="glass rounded-xl p-6 border border-red-500/50 bg-red-500/10">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Transactions"
      subtitle={`You have ${transactions.length} transactions`}
    >
      <div className="glass rounded-xl p-6">
        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(tx) => tx.id.toString()}
        />
      </div>
    </DashboardLayout>
  );
}
