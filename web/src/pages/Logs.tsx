import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLogs } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCw } from "lucide-react";

interface Log {
  id: string;
  type?: string;
  action?: string;
  user_id?: string;
  username?: string;
  ip_address?: string;
  details?: string;
  created_at: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast({
        title: "Failed to load logs",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const getLogTypeBadge = (type?: string) => {
    const safeType = type?.toLowerCase() ?? "unknown";

    switch (safeType) {
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "warning":
        return (
          <Badge className="bg-warning text-warning-foreground">
            Warning
          </Badge>
        );
      case "success":
        return (
          <Badge className="bg-success text-success-foreground">
            Success
          </Badge>
        );
      default:
        return <Badge variant="secondary">{safeType}</Badge>;
    }
  };

  const columns = [
    {
      key: "timestamp",
      header: "Time",
      render: (log: Log) => (
        <span className="text-sm text-muted-foreground font-mono">
          {log.created_at
            ? new Date(log.created_at).toLocaleString()
            : "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (log: Log) => getLogTypeBadge(log.type),
    },
    {
      key: "action",
      header: "Action",
      render: (log: Log) => (
        <span className="font-medium">
          {log.action || "—"}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (log: Log) => (
        <span className="text-muted-foreground">
          {log.username || log.user_id || "System"}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      render: (log: Log) => (
        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
          {log.ip_address || "N/A"}
        </code>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (log: Log) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs block">
          {log.details || "-"}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Activity Logs"
      subtitle="Real-time activity and event logging"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-muted-foreground">
              {logs.length} log entries
            </span>
          </div>

          <Button
            variant="outline"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={logs}
          keyExtractor={(l) => l.id}
          isLoading={isLoading}
          emptyMessage="No logs found"
        />
      </div>
    </DashboardLayout>
  );
}
