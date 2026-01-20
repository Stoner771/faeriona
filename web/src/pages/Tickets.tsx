import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTickets, getTicket, replyToTicket, closeTicket } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, X, Clock, CheckCircle } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_by: string;
  created_at: string;
  messages?: Message[];
}

interface Message {
  id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const { toast } = useToast();

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await getTickets();
      setTickets(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load tickets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    try {
      const data = await getTicket(id);
      setSelectedTicket(data);
      setDetailsOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to load ticket",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      await replyToTicket(selectedTicket.id, replyMessage);
      toast({ title: "Reply sent" });
      setReplyMessage("");
      fetchTicketDetails(selectedTicket.id);
    } catch (error: any) {
      toast({
        title: "Failed to send reply",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClose = async (id: string) => {
    try {
      await closeTicket(id);
      toast({ title: "Ticket closed" });
      setDetailsOpen(false);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Failed to close ticket",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return <Badge className="bg-success text-success-foreground">Open</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      case "pending":
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Support Tickets" subtitle="Loading...">
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6 h-24 animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Support Tickets"
      subtitle="Manage support requests from users and resellers"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span className="text-muted-foreground">
            {tickets.length} tickets
          </span>
        </div>

        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="glass rounded-xl p-6 cursor-pointer transition-all duration-300 hover:glow-primary"
              onClick={() => fetchTicketDetails(ticket.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    From: {ticket.created_by}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(ticket.status)}
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {tickets.length === 0 && (
            <div className="glass rounded-xl p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tickets</h3>
              <p className="text-muted-foreground">
                All support requests will appear here
              </p>
            </div>
          )}
        </div>

        {/* Ticket Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="glass-strong border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedTicket?.subject}</span>
                {selectedTicket && getStatusBadge(selectedTicket.status)}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTicket && (
              <div className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {selectedTicket.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg ${
                          msg.is_admin
                            ? "bg-primary/20 ml-8"
                            : "bg-muted mr-8"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {msg.is_admin ? "Admin" : selectedTicket.created_by}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedTicket.status.toLowerCase() !== "closed" && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="space-y-2">
                      <Label>Reply</Label>
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="bg-input min-h-[100px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleReply}
                        className="flex-1"
                        variant="glow"
                        disabled={!replyMessage.trim()}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Reply
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleClose(selectedTicket.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Close Ticket
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
