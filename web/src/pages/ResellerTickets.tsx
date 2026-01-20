import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { resellerGetTickets, apiRequest } from "@/lib/api";
import { Plus } from "lucide-react";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  updated_at: string;
}

export default function ResellerTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      console.log("ResellerTickets: Fetching tickets...");
      const data = await resellerGetTickets();
      console.log("ResellerTickets: Data received", data);
      setTickets(data);
      setError(null);
    } catch (err: any) {
      console.error("ResellerTickets: Error", err);
      const errorMsg = err.message || "Failed to load tickets";
      setError(errorMsg);
      toast({
        title: "Failed to load tickets",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  const handleCreateTicket = async () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      await apiRequest("/reseller/tickets", {
        method: "POST",
        body: JSON.stringify({ title, description }),
      });

      toast({
        title: "Success",
        description: "Ticket created successfully",
      });

      setTitle("");
      setDescription("");
      await fetchTickets();
    } catch (err: any) {
      toast({
        title: "Failed to create ticket",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-500/20 text-blue-500";
      case "in_progress":
        return "bg-yellow-500/20 text-yellow-500";
      case "resolved":
        return "bg-green-500/20 text-green-500";
      case "closed":
        return "bg-gray-500/20 text-gray-500";
      default:
        return "bg-muted";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/20 text-red-500";
      case "high":
        return "bg-orange-500/20 text-orange-500";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500";
      case "low":
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-muted";
    }
  };

  const columns = [
    {
      header: "Title",
      render: (ticket: Ticket) => (
        <div>
          <p className="font-medium">{ticket.title}</p>
          <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
        </div>
      ),
    },
    {
      header: "Status",
      render: (ticket: Ticket) => (
        <Badge className={getStatusColor(ticket.status)}>
          {ticket.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "Priority",
      render: (ticket: Ticket) => (
        <Badge className={getPriorityColor(ticket.priority)}>
          {ticket.priority}
        </Badge>
      ),
    },
    {
      header: "Created",
      render: (ticket: Ticket) =>
        new Date(ticket.created_at).toLocaleDateString(),
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Support Tickets" subtitle="Manage your support tickets">
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
      <DashboardLayout title="Support Tickets" subtitle="Manage your support tickets">
        <div className="glass rounded-xl p-6 border border-red-500/50 bg-red-500/10">
          <p className="text-red-500">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Support Tickets" subtitle={`You have ${tickets.length} tickets`}>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Ticket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="What is the issue?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                  />
                </div>
                <Button
                  onClick={handleCreateTicket}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? "Creating..." : "Create Ticket"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass rounded-xl p-6">
          <DataTable
            columns={columns}
            data={tickets}
            keyExtractor={(ticket) => ticket.id.toString()}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
