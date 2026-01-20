import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import {
  resellerGetProfile,
  resellerGetTransactions,
  resellerGetLicenses,
  resellerGetTickets,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Key,
  Ticket,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  History,
  PlusCircle,
  Package,
} from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/* ---------------- TYPES ---------------- */
interface Profile {
  username: string;
  email: string;
  company_name?: string;
  credits: string;
  is_verified: boolean;
}

interface Transaction {
  id: number;
  transaction_type: "credit" | "debit";
  amount: string;
  description?: string;
}

interface License {
  is_active: boolean;
}

interface TicketData {
  status: "open" | "resolved";
}

/* ---------------- COMPONENT ---------------- */
export default function ResellerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [p, t, l, ti] = await Promise.all([
          resellerGetProfile(),
          resellerGetTransactions().catch(() => []),
          resellerGetLicenses().catch(() => []),
          resellerGetTickets().catch(() => []),
        ]);
        setProfile(p);
        setTransactions(t);
        setLicenses(l);
        setTickets(ti);
      } catch {
        toast({
          title: "Sync Error",
          description: "Failed to refresh dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [toast]);

  const credits = Number(profile?.credits || 0);

  /* ---------------- TABLE ---------------- */
  const columns = [
    {
      key: "type",
      header: "Operation",
      render: (t: Transaction) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              t.transaction_type === "debit"
                ? "bg-red-500/10 text-red-500"
                : "bg-emerald-500/10 text-emerald-500"
            )}
          >
            {t.transaction_type === "debit" ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold capitalize">
              {t.transaction_type}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t.description || "System process"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      render: (t: Transaction) => (
        <span
          className={cn(
            "font-mono text-xs font-bold",
            t.transaction_type === "debit"
              ? "text-red-400"
              : "text-emerald-400"
          )}
        >
          {t.transaction_type === "debit" ? "-" : "+"}$
          {Number(t.amount).toFixed(2)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading...">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-card/50 animate-pulse border"
            />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Reseller Hub"
      subtitle={`Welcome back, ${profile?.username}`}
    >
      <div className="w-full space-y-6 pb-10">

        {/* ---------------- HERO SECTION RESPONSIVE ---------------- */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 rounded-2xl border bg-card/60 p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold truncate">
                  {profile?.company_name || profile?.username}
                </h2>
                {profile?.is_verified && (
                  <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-xs sm:text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-xl sm:text-2xl font-extrabold text-primary">
              ${credits.toFixed(2)}
            </p>
          </div>
        </div>

        {/* ---------------- STATS GRID RESPONSIVE ---------------- */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard title="Total Keys" value={licenses.length} icon={Key} />
          <StatsCard
            title="Active"
            value={licenses.filter(l => l.is_active).length}
            icon={Zap}
          />
          <StatsCard
            title="Open Tickets"
            value={tickets.filter(t => t.status === "open").length}
            icon={Ticket}
          />
          <StatsCard
            title="Resolved"
            value={tickets.filter(t => t.status === "resolved").length}
            icon={TrendingUp}
          />
        </div>

        {/* ---------------- ACTION CARDS RESPONSIVE ---------------- */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <ActionCard
            icon={PlusCircle}
            title="Create Keys"
            desc="Generate new licenses"
            primary
            onClick={() => navigate("/reseller/licenses")}
          />
          <ActionCard
            icon={Ticket}
            title="Support Tickets"
            desc="Manage user tickets"
            onClick={() => navigate("/reseller/tickets")}
          />
          <ActionCard
            icon={Package}
            title="Products"
            desc="View applications"
            onClick={() => navigate("/reseller/applications")}
          />
        </div>

        {/* ---------------- ACTIVITY TABLE RESPONSIVE ---------------- */}
        <div className="w-full rounded-2xl border bg-card/40 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 border-b">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="text-sm font-bold truncate">Recent Activity</h3>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate("/reseller/transactions")}
              className="w-fit"
            >
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={transactions.slice(0, 5)}
              keyExtractor={t => t.id.toString()}
              emptyMessage="No recent activity"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ---------------- ACTION CARD ---------------- */
function ActionCard({
  icon: Icon,
  title,
  desc,
  primary,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-xl border text-left transition hover:scale-[1.01]",
        primary
          ? "bg-primary/10 border-primary/30"
          : "bg-card/40 border-border"
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h4 className="text-sm font-bold">{title}</h4>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
