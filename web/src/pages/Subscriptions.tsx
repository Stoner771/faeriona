import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Copy,
  Power,
  RotateCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

interface SubscriptionLevel {
  id: number;
  app_id: number;
  name: string;
  level: number;
}

interface Subscription {
  id: number;
  user_id: number;
  app_id: number;
  tier: string;
  status: string;
  subscription_key: string;
  start_date: string;
  expiry_date: string;
  auto_renew: boolean;
  price: number;
  currency: string;
  billing_cycle: string;
  max_devices: number;
  max_apps: number;
  priority_support: boolean;
  advanced_features: boolean;
  created_at: string;
  updated_at: string;
  last_renewal_date: string | null;
  notes: string | null;
  user_username?: string;
  app_name?: string;
}

interface App {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
}

const TIER_COLORS = {
  basic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  standard: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  premium: "bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200",
  enterprise: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  suspended: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export default function Subscriptions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [levels, setLevels] = useState<SubscriptionLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newLevelData, setNewLevelData] = useState({ name: "", level: "1" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showKey, setShowKey] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    user_id: "",
    app_id: "",
    tier: "basic",
    duration_days: "30",
    billing_cycle: "monthly",
    price: "0",
    max_devices: "1",
    max_apps: "1",
    priority_support: false,
    advanced_features: false,
    notes: "",
  });

  const [renewData, setRenewData] = useState({ duration_days: "30" });
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetchSubscriptions();
    fetchApps();
    fetchUsers();
  }, [selectedApp, selectedStatus, currentPage]);

  useEffect(() => {
    if (selectedApp !== "all") {
      fetchLevels(parseInt(selectedApp));
    } else {
      setLevels([]);
    }
  }, [selectedApp]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const appFilter = selectedApp && selectedApp !== "all" ? `&app_id=${selectedApp}` : "";
      const statusFilter = selectedStatus && selectedStatus !== "all" ? `&status_filter=${selectedStatus}` : "";
      const endpoint = `/admin/subscriptions?skip=${(currentPage - 1) * pageSize}&limit=${pageSize}${appFilter}${statusFilter}`;

      const response = await apiRequest(endpoint);
      setSubscriptions(response.subscriptions || []);
      setTotalItems(response.total || 0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch subscriptions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const response = await apiRequest("/admin/apps?skip=0&limit=100");
      setApps(response.apps || response || []);
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiRequest("/admin/users?skip=0&limit=500");
      setUsers(response.users || response || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchLevels = async (appId: number) => {
    try {
      const response = await apiRequest(`/admin/subscriptions/levels/?app_id=${appId}`);
      setLevels(response || []);
    } catch (error) {
      console.error("Failed to fetch levels", error);
    }
  };

  const handleCreateLevel = async () => {
    if (selectedApp === "all") return;
    try {
      await apiRequest("/admin/subscriptions/levels/", {
        method: "POST",
        body: JSON.stringify({
          app_id: parseInt(selectedApp),
          name: newLevelData.name,
          level: parseInt(newLevelData.level),
        }),
      });
      toast({ title: "Success", description: "Level created" });
      fetchLevels(parseInt(selectedApp));
      setIsLevelDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateSubscription = async () => {
    try {
      if (!formData.user_id || !formData.app_id) {
        toast({ title: "Error", description: "Please select user and app", variant: "destructive" });
        return;
      }

      const payload = {
        user_id: parseInt(formData.user_id),
        app_id: parseInt(formData.app_id),
        tier: formData.tier,
        duration_days: parseInt(formData.duration_days),
        billing_cycle: formData.billing_cycle,
        price: parseInt(formData.price),
        max_devices: parseInt(formData.max_devices),
        max_apps: parseInt(formData.max_apps),
        priority_support: formData.priority_support,
        advanced_features: formData.advanced_features,
        notes: formData.notes || null,
      };

      await apiRequest("/admin/subscriptions", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({ title: "Success", description: "Subscription created successfully" });
      setIsCreateOpen(false);
      fetchSubscriptions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create subscription", variant: "destructive" });
    }
  };

  const handleRenewSubscription = async () => {
    if (!selectedSubscription) return;
    try {
      await apiRequest(`/admin/subscriptions/${selectedSubscription.id}/renew`, {
        method: "POST",
        body: JSON.stringify({ subscription_id: selectedSubscription.id, duration_days: parseInt(renewData.duration_days) }),
      });
      toast({ title: "Success", description: "Subscription renewed" });
      setIsRenewOpen(false);
      fetchSubscriptions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSuspendSubscription = async (id: number) => {
    try {
      await apiRequest(`/admin/subscriptions/${id}/suspend`, { method: "POST" });
      toast({ title: "Success", description: "Subscription suspended" });
      fetchSubscriptions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleActivateSubscription = async (id: number) => {
    try {
      await apiRequest(`/admin/subscriptions/${id}/activate`, { method: "POST" });
      toast({ title: "Success", description: "Subscription activated" });
      fetchSubscriptions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSubscription = async () => {
    if (!selectedSubscription) return;
    try {
      await apiRequest(`/admin/subscriptions/${selectedSubscription.id}`, { method: "DELETE" });
      toast({ title: "Success", description: "Subscription deleted" });
      setIsDeleteOpen(false);
      fetchSubscriptions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Key copied to clipboard" });
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <DashboardLayout title="Subscriptions">
      <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage user subscriptions and levels</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Manage Levels</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Subscription Levels</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder="Level Name" value={newLevelData.name} onChange={e => setNewLevelData({...newLevelData, name: e.target.value})} />
                  <Input type="number" placeholder="Rank" value={newLevelData.level} onChange={e => setNewLevelData({...newLevelData, level: e.target.value})} />
                  <Button onClick={handleCreateLevel} className="w-full">Add Level</Button>
                  {levels.map(l => <div key={l.id} className="p-2 bg-muted rounded flex justify-between"><span>{l.name}</span><span>Rank: {l.level}</span></div>)}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Subscription</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Create Subscription</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select value={formData.user_id} onValueChange={v => setFormData({...formData, user_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Application</Label>
                    <Select value={formData.app_id} onValueChange={v => setFormData({...formData, app_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select app" /></SelectTrigger>
                      <SelectContent>{apps.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Select value={formData.tier} onValueChange={v => setFormData({...formData, tier: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                        {levels.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateSubscription} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <Select value={selectedApp} onValueChange={setSelectedApp}>
            <SelectTrigger className="w-48"><SelectValue placeholder="App" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Apps</SelectItem>{apps.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> : 
               subscriptions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No subscriptions found</TableCell></TableRow> :
               subscriptions.map(sub => (
                <TableRow key={sub.id}>
                  <TableCell>{sub.user_username}</TableCell>
                  <TableCell>{sub.app_name}</TableCell>
                  <TableCell><Badge variant="outline">{sub.tier}</Badge></TableCell>
                  <TableCell><Badge className={STATUS_COLORS[sub.status as keyof typeof STATUS_COLORS]}>{sub.status}</Badge></TableCell>
                  <TableCell>{formatDate(sub.expiry_date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button size="icon" variant="ghost" onClick={() => copyToClipboard(sub.subscription_key)}><Copy className="h-4 w-4" /></Button>
                       {sub.status === 'active' ? 
                         <Button size="icon" variant="ghost" onClick={() => handleSuspendSubscription(sub.id)}><Power className="h-4 w-4 text-orange-500" /></Button> :
                         <Button size="icon" variant="ghost" onClick={() => handleActivateSubscription(sub.id)}><Power className="h-4 w-4 text-green-500" /></Button>
                       }
                       <Button size="icon" variant="ghost" onClick={() => { setSelectedSubscription(sub); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
               ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Subscription?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4"><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSubscription} className="bg-destructive">Delete</AlertDialogAction></div>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
