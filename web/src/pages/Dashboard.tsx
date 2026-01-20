import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { getAdminStats, getHealth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Key, Users, AppWindow, UserCog, Activity, Shield, Clock, Server, AlertCircle } from "lucide-react";

interface Stats {
  total_licenses: number;
  total_users: number;
  total_applications: number;
  total_resellers: number;
  active_licenses: number;
  banned_users: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Dashboard: Fetching admin stats...");
        const [statsData, healthData] = await Promise.all([
          getAdminStats(),
          getHealth().catch(() => null),
        ]);
        console.log("Dashboard: Stats received", statsData);
        setStats(statsData);
        setHealth(healthData);
        setError(null);
      } catch (error: any) {
        console.error("Dashboard: Error fetching stats", error);
        const errorMsg = error.message || "Failed to load dashboard data";
        setError(errorMsg);
        toast({
          title: "Failed to load stats",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [toast]);

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading...">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-4" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Error">
        <div className="glass rounded-xl p-6 border border-red-500/50 bg-red-500/10">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-red-500 mb-2">Failed to Load Dashboard</h2>
              <p className="text-red-400 mb-4">{error}</p>
              <p className="text-sm text-muted-foreground">
                Make sure you are logged in and have the correct permissions. Check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Welcome to Faerion Admin Panel"
    >
      <div className="space-y-8">
        {/* Main Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Licenses"
            value={stats?.total_licenses || 0}
            icon={Key}
          />
          <StatsCard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={Users}
          />
          <StatsCard
            title="Applications"
            value={stats?.total_applications || 0}
            icon={AppWindow}
          />
          <StatsCard
            title="Resellers"
            value={stats?.total_resellers || 0}
            icon={UserCog}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Active Licenses"
            value={stats?.active_licenses || 0}
            icon={Activity}
          />
          <StatsCard
            title="Banned Users"
            value={stats?.banned_users || 0}
            icon={Shield}
          />
          <div className="glass rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <p className="mt-2 text-3xl font-bold text-success">Online</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {health?.uptime ? `Uptime: ${Math.floor(health.uptime / 3600)}h` : "All systems operational"}
                </p>
              </div>
              <div className="rounded-lg bg-success/20 p-3">
                <Server className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Information</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Server Time</p>
                <p className="font-medium">{new Date().toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">API Version</p>
                <p className="font-medium">2.0.0</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Security</p>
                <p className="font-medium">Bearer Token Auth</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
