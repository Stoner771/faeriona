import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  getResellers,
  createReseller,
  updateReseller,
  deleteReseller,
  addResellerBalance,
  deductResellerBalance,
  getApplications,
  assignApplicationToReseller,
  removeApplicationFromReseller,
  getResellerApplications,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, UserCog, Coins, PlusCircle, MinusCircle, Package, Check, X, Shield, Wallet, RefreshCw, Phone, Building, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reseller {
  id: string;
  username: string;
  credits: number;
  is_active: boolean;
  created_at: string;
  total_licenses_created?: number;
  email?: string;
  company_name?: string;
  phone?: string;
  notes?: string;
}

interface Application {
  id: string;
  name: string;
}

export default function Resellers() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [editReseller, setEditReseller] = useState<Reseller | null>(null);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [resellerProducts, setResellerProducts] = useState<string[]>([]);
  const [balanceAction, setBalanceAction] = useState<"add" | "deduct">("add");
  const [balanceAmount, setBalanceAmount] = useState<string>("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credits, setCredits] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const fetchResellers = async () => {
    setIsLoading(true);
    try {
      const [resellersData, appsData] = await Promise.all([
        getResellers(),
        getApplications().catch(() => []),
      ]);
      setResellers(resellersData || []);
      setApplications(appsData || []);
    } catch (error: any) {
      toast({
        title: "Failed to load resellers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  const handleSubmit = async () => {
    try {
      if (editReseller) {
        await updateReseller(editReseller.id, { 
          enabled: isActive,
          email: email,
          company_name: companyName,
          phone: phone,
          notes: notes
        });
        toast({ title: "Reseller updated" });
      } else {
        if (!username || !email || !password) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive",
          });
          return;
        }
        await createReseller({ 
          username, 
          email, 
          password, 
          initial_credits: credits,
          app_ids: selectedApps.map(id => parseInt(id)),
          company_name: companyName,
          phone: phone,
          notes: notes
        });
        toast({ title: "Reseller created" });
      }
      setDialogOpen(false);
      resetForm();
      fetchResellers();
    } catch (error: any) {
      toast({
        title: editReseller ? "Failed to update" : "Failed to create",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReseller(id);
      toast({ title: "Reseller deleted" });
      fetchResellers();
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBalanceChange = async () => {
    const amount = parseFloat(balanceAmount);
    if (!selectedReseller || isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      if (balanceAction === "add") {
        await addResellerBalance(selectedReseller.id, amount);
      } else {
        await deductResellerBalance(selectedReseller.id, amount);
      }
      toast({
        title: "Success",
        description: `Balance ${balanceAction === "add" ? "added" : "deducted"} successfully`,
      });
      setBalanceDialogOpen(false);
      setBalanceAmount("");
      setSelectedReseller(null);
      fetchResellers();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openBalanceDialog = (r: Reseller) => {
    setSelectedReseller(r);
    setBalanceAction("add");
    setBalanceAmount("");
    setBalanceDialogOpen(true);
  };

  const openProductsDialog = async (r: Reseller) => {
    setSelectedReseller(r);
    setProductsLoading(true);
    setProductsDialogOpen(true);
    try {
      const products = await getResellerApplications(r.id);
      const productIds = products?.map((p: any) => String(p.id || p)) || [];
      setResellerProducts(productIds);
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      setResellerProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductToggle = async (appId: string, isAdding: boolean) => {
    if (!selectedReseller) return;
    try {
      const appIdNum = parseInt(appId);
      if (isAdding) {
        await assignApplicationToReseller(selectedReseller.id, appIdNum);
        setResellerProducts([...resellerProducts, appId]);
        toast({ title: "Product assigned" });
      } else {
        await removeApplicationFromReseller(selectedReseller.id, appIdNum);
        setResellerProducts(resellerProducts.filter(id => id !== appId));
        toast({ title: "Product removed" });
      }
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setCredits(0);
    setIsActive(true);
    setCompanyName("");
    setPhone("");
    setNotes("");
    setEditReseller(null);
    setSelectedApps([]);
  };

  const openEdit = (r: Reseller) => {
    setEditReseller(r);
    setUsername(r.username);
    setEmail(r.email || "");
    setCompanyName(r.company_name || "");
    setPhone(r.phone || "");
    setNotes(r.notes || "");
    setIsActive(r.is_active);
    setDialogOpen(true);
  };

  const columns = [
    {
      key: "username",
      header: "Reseller",
      render: (r: Reseller) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-sm tracking-tight">{r.username}</span>
        </div>
      ),
    },
    {
      key: "credits",
      header: "Available Credits",
      render: (r: Reseller) => (
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary/70" />
          <span className="font-mono font-bold text-primary">${parseFloat(String(r.credits)).toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: Reseller) => (
        <Badge 
          className={cn(
            "font-bold text-[10px] uppercase tracking-wider",
            r.is_active ? "bg-primary/20 text-primary border-primary/20" : "bg-muted text-muted-foreground"
          )}
          variant="outline"
        >
          {r.is_active ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Control Center",
      render: (r: Reseller) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openProductsDialog(r)}
            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            title="Products"
          >
            <Package className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openBalanceDialog(r)}
            className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
            title="Credits"
          >
            <Coins className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(r)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(r.id)}
            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Reseller Management"
      subtitle="Control partner accounts, credits, and product distribution"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">
              {resellers.length} PARTNER ACCOUNTS
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="glow" className="w-full sm:w-auto h-11 font-bold gap-2">
                <Plus className="h-4 w-4" />
                Add New Reseller
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                  <UserCog className="h-6 w-6 text-primary" />
                  {editReseller ? "EDIT PARTNER" : "NEW PARTNER"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="grid gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</Label>
                    <Input
                      placeholder="e.g. jsmith_reseller"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={!!editReseller}
                      className="bg-background h-11 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background h-11 font-medium"
                    />
                  </div>
                  {!editReseller && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                      <Input
                        type="password"
                        placeholder="Secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-background h-11 font-medium"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 p-4 rounded-2xl bg-muted/20 border border-border/50">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Building className="h-3 w-3" /> Company Name
                    </Label>
                    <Input
                      placeholder="Optional"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-background h-11 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3 w-3" /> Phone Number
                    </Label>
                    <Input
                      placeholder="Optional"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-background h-11 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <FileText className="h-3 w-3" /> Notes
                    </Label>
                    <Input
                      placeholder="Internal notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-background h-11 font-medium"
                    />
                  </div>
                </div>

                {!editReseller && (
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initial Credits</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          value={credits}
                          onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                          className="bg-background h-11 font-bold pl-10"
                          placeholder="0.00"
                        />
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assign Products</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto scrollbar-none p-1">
                        {applications.map((app) => (
                          <div key={app.id} className="flex items-center space-x-3 p-3 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-all">
                            <Checkbox
                              id={`app-${app.id}`}
                              checked={selectedApps.includes(app.id)}
                              onCheckedChange={(checked) => {
                                setSelectedApps(checked ? [...selectedApps, app.id] : selectedApps.filter(id => id !== app.id));
                              }}
                            />
                            <label htmlFor={`app-${app.id}`} className="text-sm font-semibold cursor-pointer flex-1">
                              {app.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {editReseller && (
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50">
                    <Label className="font-bold">Account Status</Label>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                )}
                
                <Button onClick={handleSubmit} className="w-full h-12 font-black text-sm" variant="glow">
                  {editReseller ? "UPDATE PARTNER ACCOUNT" : "CREATE PARTNER ACCOUNT"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="glass-strong rounded-3xl border border-border/50 overflow-hidden shadow-2xl">
          <DataTable
            columns={columns}
            data={resellers}
            keyExtractor={(r) => r.id}
            isLoading={isLoading}
            emptyMessage="No partner accounts registered yet"
          />
        </div>

        {/* Balance Dialog */}
        <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
          <DialogContent className="glass-strong border-border sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <Wallet className="h-6 w-6 text-primary" />
                CREDIT MANAGER
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 text-center">
                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-1">Current Funds</p>
                <p className="text-4xl font-black text-primary tracking-tighter">
                  ${parseFloat(String(selectedReseller?.credits || 0)).toFixed(2)}
                </p>
              </div>

              <div className="flex gap-2 p-1 bg-muted rounded-xl">
                <Button
                  variant={balanceAction === "add" ? "default" : "ghost"}
                  className="flex-1 font-bold h-11"
                  onClick={() => setBalanceAction("add")}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add
                </Button>
                <Button
                  variant={balanceAction === "deduct" ? "destructive" : "ghost"}
                  className="flex-1 font-bold h-11"
                  onClick={() => setBalanceAction("deduct")}
                >
                  <MinusCircle className="mr-2 h-4 w-4" /> Deduct
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount to Transfer</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="bg-input h-14 text-2xl font-black text-center pr-12"
                  />
                  <Coins className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                </div>
              </div>

              {balanceAmount && !isNaN(parseFloat(balanceAmount)) && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center space-y-1">
                  <div className="flex justify-between text-xs font-bold opacity-60">
                    <span>Current</span>
                    <span>${parseFloat(String(selectedReseller?.credits || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-primary">
                    <span>Adjustment</span>
                    <span>{balanceAction === "add" ? "+" : "-"}${parseFloat(balanceAmount).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-border/50 flex justify-between font-black">
                    <span>Balance After</span>
                    <span className="text-lg">
                      ${(parseFloat(String(selectedReseller?.credits || 0)) + (balanceAction === "add" ? 1 : -1) * parseFloat(balanceAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleBalanceChange} 
                className="w-full h-14 font-black text-sm" 
                variant={balanceAction === "add" ? "glow" : "destructive"}
              >
                {balanceAction === "add" ? "EXECUTE CREDIT TRANSFER" : "CONFIRM CREDIT DEDUCTION"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Products Dialog */}
        <Dialog open={productsDialogOpen} onOpenChange={setProductsDialogOpen}>
          <DialogContent className="glass-strong border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                <Package className="h-6 w-6 text-primary" />
                PRODUCT ACCESS
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid gap-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-none">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : applications.map((app) => {
                  const appIdStr = String(app.id);
                  const isAssigned = resellerProducts.includes(appIdStr);
                  return (
                    <div key={app.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50 group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center group-hover:border-primary/20 transition-all">
                          <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{app.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={isAssigned ? "destructive" : "default"}
                        onClick={() => handleProductToggle(appIdStr, !isAssigned)}
                        className="h-9 font-bold px-4 rounded-xl"
                      >
                        {isAssigned ? "REMOVE" : "ASSIGN"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
