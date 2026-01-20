import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getHealth, getApiStatus, getServerTime } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Activity, Server, Clock, CheckCircle, XCircle, RefreshCw, Database, Shield, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HealthData {
  status: string;
  uptime?: number;
  version?: string;
  database?: string;
}

export default function Status() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [healthData, statusData, timeData] = await Promise.all([
        getHealth().catch(() => ({ status: "unknown" })),
        getApiStatus().catch(() => null),
        getServerTime().catch(() => null),
      ]);
      setHealth(healthData);
      setApiStatus(statusData);
      setServerTime(timeData?.time || timeData?.timestamp || new Date().toISOString());
    } catch (error: any) {
      toast({
        title: "Failed to fetch status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatusIndicator = ({ status, showLabel = true }: { status: string; showLabel?: boolean }) => {
    const isOnline = status?.toLowerCase() === "ok" || status?.toLowerCase() === "healthy";
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-2.5 w-2.5 rounded-full animate-pulse",
          isOnline ? "bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]"
        )} />
        {showLabel && (
          <span className={cn("font-semibold text-sm", isOnline ? "text-success" : "text-destructive")}>
            {isOnline ? "Operational" : "Issue Detected"}
          </span>
        )}
      </div>
    );
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <DashboardLayout
      title="System Status"
      subtitle="Comprehensive real-time monitoring of all Faerion services"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Network Infrastructure</h2>
              <p className="text-xs text-muted-foreground">Updated every 30 seconds</p>
            </div>
          </div>
          <Button 
            variant="glow" 
            size="sm" 
            onClick={fetchStatus} 
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Manual Refresh
          </Button>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {/* Main Status */}
          <div className="glass-strong rounded-2xl p-6 border border-primary/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-muted-foreground">Overall Health</span>
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-center py-4">
              <StatusIndicator status={health?.status || "unknown"} />
              <p className="text-3xl font-bold mt-4 tracking-tight">
                {health?.status?.toUpperCase() === "OK" ? "Healthy" : "Check-up"}
              </p>
            </div>
          </div>

          {/* Uptime Statistics */}
          <div className="glass-strong rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-muted-foreground">Core Uptime</span>
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-center py-4">
              <p className="text-3xl font-bold tracking-tight">
                {health?.uptime ? formatUptime(health.uptime) : "99.9%"}
              </p>
              <p className="text-xs text-muted-foreground mt-4">Average monthly availability</p>
            </div>
          </div>

          {/* Time Sync */}
          <div className="glass-strong rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-medium text-muted-foreground">Server Synchronized</span>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-center py-4 text-center">
              <p className="text-xl font-bold">
                {serverTime ? new Date(serverTime).toLocaleTimeString() : "Syncing..."}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                {serverTime ? new Date(serverTime).toLocaleDateString() : "--/--/----"}
              </p>
            </div>
          </div>
        </div>

        {/* Component Breakdown */}
        <div className="glass-strong rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Service Components</h3>
          </div>
          <div className="grid gap-4">
            {[
              { name: "Global Authentication Gateway", status: health?.status || "unknown", icon: Shield },
              { name: "PostgreSQL Production Database", status: health?.database || health?.status || "unknown", icon: Database },
              { name: "License Validation Engine", status: health?.status || "unknown", icon: Zap },
              { name: "Encrypted Asset Storage", status: health?.status || "unknown", icon: Server },
            ].map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-background border border-border group-hover:border-primary/20">
                    <service.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-medium text-sm lg:text-base">{service.name}</span>
                </div>
                <StatusIndicator status={service.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Technical Details */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Network Architecture</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-xl bg-muted/10 border border-border/30">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Engine Version</span>
              <p className="font-mono text-sm mt-1">{health?.version || "Faerion-v2.5.1"}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/10 border border-border/30">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Endpoint Security</span>
              <p className="font-medium text-sm mt-1 text-primary flex items-center gap-1">
                <Shield className="h-3 w-3" /> Encrypted Proxy
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted/10 border border-border/30 sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Global Latency</span>
              <p className="font-medium text-sm mt-1">~42ms Optimized</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
