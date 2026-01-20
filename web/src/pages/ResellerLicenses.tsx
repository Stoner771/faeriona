import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  resellerGetLicenses,
  resellerCreateLicenses,
  resellerResetHwid,
  resellerGetApps,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Copy, Key, Check, Info, Shield, Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface License {
  id: number;
  license_key: string;
  hwid?: string;
  expiry_timestamp?: string;
  is_active: boolean;
  app_id?: number;
  user_id?: number;
  created_at: string;
  app_name?: string;
}

interface Product {
  id: string;
  name: string;
}

export default function ResellerLicenses() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "used" | "unused" | "active" | "expired">("all");
  const { toast } = useToast();

  const [appId, setAppId] = useState("");
  const [count, setCount] = useState(1);
  const [durationDays, setDurationDays] = useState(31);
  const [prefix, setPrefix] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log("[ResellerLicenses] Fetching data...");
      const [licensesData, appsData] = await Promise.all([
        resellerGetLicenses(),
        resellerGetApps().catch(() => []),
      ]);
      console.log("[ResellerLicenses] Data fetched:", { licensesData, appsData });
      setLicenses(licensesData || []);
      setProducts(appsData || []);
    } catch (error: any) {
      console.error("[ResellerLicenses] Error fetching data:", error);
      toast({
        title: "Failed to load licenses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("[ResellerLicenses] Component mounted, fetching data...");
    fetchData();
  }, []);

  useEffect(() => {
    // Auto-select first product if only one is available
    if (products.length === 1 && !appId) {
      setAppId(products[0].id);
    }
  }, [products, appId]);

  const handleCreate = async () => {
    if (!appId || products.length === 0) {
      toast({
        title: "Error",
        description: products.length === 0 ? "No products assigned to you" : "Select a product",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await resellerCreateLicenses({
        app_id: appId,
        count,
        duration_days: durationDays,
        prefix: prefix || undefined,
      });
      toast({
        title: "Licenses created",
        description: `Successfully created ${count} license(s)`,
      });
      setDialogOpen(false);
      setAppId("");
      setCount(1);
      setDurationDays(31);
      setPrefix("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Failed to create licenses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetHwid = async (key: string) => {
    try {
      await resellerResetHwid(key);
      toast({ title: "HWID reset successfully" });
      setInfoOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Failed to reset HWID",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text || text.trim() === '') {
      toast({ 
        title: "Error", 
        description: "Nothing to copy",
        variant: "destructive"
      });
      return;
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      
      if (!successful) {
        throw new Error("execCommand failed");
      }
      
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      
      toast({ 
        title: "✓ Copied!",
        description: "License key copied"
      });
    } catch (error) {
      console.error("Copy error:", error);
      toast({ 
        title: "Failed to copy", 
        description: "Try copy manually (Ctrl+C)",
        variant: "destructive"
      });
    }
  };

  const openLicenseInfo = (license: License) => {
    setSelectedLicense(license);
    setInfoOpen(true);
  };

  const usedLicenses = licenses.filter(l => l.hwid).length;
  const unusedLicenses = licenses.filter(l => !l.hwid).length;
  const activeLicenses = licenses.filter(l => l.is_active).length;

  const filteredLicenses = licenses.filter(license => {
    // Search filter
    const matchesSearch = 
      license.license_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.app_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.hwid?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (filterStatus === "used") return !!license.hwid;
    if (filterStatus === "unused") return !license.hwid;
    if (filterStatus === "active") return license.is_active && license.hwid;
    if (filterStatus === "expired") return !license.is_active && license.hwid;
    
    return true;
  });

  const columns = [
    {
      key: "license_key",
      header: "License Key",
      render: (license: License) => {
        const isCopied = copiedKey;
        
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-1 min-w-0">
              <code className="font-mono text-sm bg-muted px-4 py-2.5 rounded-lg block break-all">
                {license.license_key}
              </code>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 transition-all flex-shrink-0",
                isCopied && "bg-green-100 text-green-700"
              )}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(license.license_key);
              }}
              title="Copy license key"
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        );
      },
    },
    {
      key: "app",
      header: "Product",
      render: (license: License) => (
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {license.app_name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <span className="font-medium text-sm">
            {license.app_name || `App #${license.app_id}`}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (license: License) => {
        const isUsed = !!license.hwid;
        const isActive = license.is_active;
        
        if (!isUsed) {
          return (
            <Badge 
              variant="secondary"
              className="font-medium"
            >
              Unused
            </Badge>
          );
        }
        
        return (
          <Badge 
            variant={isActive ? "default" : "secondary"}
            className={cn(
              "font-medium",
              isActive && "bg-green-100 text-green-700"
            )}
          >
            {isActive ? "Active" : "Expired"}
          </Badge>
        );
      },
    },
    {
      key: "expires",
      header: "Expiry Date",
      render: (license: License) => {
        const expiryDate = license.expiry_timestamp ? new Date(license.expiry_timestamp) : null;
        const isExpired = expiryDate && expiryDate < new Date();
        
        return (
          <div className="space-y-1">
            <span className={cn(
              "text-sm font-medium",
              isExpired && "text-destructive"
            )}>
              {expiryDate ? expiryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : "Never"}
            </span>
            {expiryDate && (
              <div className="text-xs text-muted-foreground">
                {isExpired ? "Expired" : `${Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "created",
      header: "Created",
      render: (license: License) => (
        <span className="text-sm text-muted-foreground">
          {new Date(license.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (license: License) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openLicenseInfo(license);
            }}
            className="h-9 w-9 hover:bg-muted"
            title="View details"
          >
            <Info className="h-4 w-4" />
          </Button>
          {license.hwid && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleResetHwid(license.license_key);
              }}
              className="h-9 w-9 hover:bg-muted"
              title="Reset HWID"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="My Licenses"
      subtitle="Manage your reseller licenses and distributions"
    >
      <div className="w-full space-y-6">
        {/* Stats Cards - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-strong p-4 sm:p-6 rounded-xl border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Licenses</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2">{licenses.length}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Key className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-strong p-4 sm:p-6 rounded-xl border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Used</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2">{usedLicenses}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-strong p-4 sm:p-6 rounded-xl border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2">{activeLicenses}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-strong p-4 sm:p-6 rounded-xl border border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Unused</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2">{unusedLicenses}</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Key className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Control Bar - Responsive */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-center">
          {/* Left: Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search licenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Right: Control Buttons - KEY | FILTER | REFRESH in box */}
          <div className="flex items-center gap-0 bg-input rounded-lg border border-border flex-shrink-0 divide-x divide-border">
            {/* Create Button with Key Icon */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-none hover:bg-primary/15 hover:text-primary transition-colors"
                  title="Create licenses"
                >
                  <Key className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-border sm:max-w-md w-full mx-4">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Create New Licenses</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Product *</Label>
                    {products.length === 1 ? (
                      <div className="px-4 py-2.5 rounded-lg bg-input border border-border text-sm font-medium">
                        {products[0].name}
                      </div>
                    ) : (
                      <Select value={appId} onValueChange={setAppId}>
                        <SelectTrigger className="bg-input h-11">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((app) => (
                            <SelectItem key={app.id} value={app.id}>
                              {app.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {products.length === 0 && (
                      <p className="text-xs text-destructive">No products assigned to you. Contact your admin.</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Count</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                        className="bg-input h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Duration (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={durationDays}
                        onChange={(e) => setDurationDays(parseInt(e.target.value) || 31)}
                        className="bg-input h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Prefix (optional)</Label>
                    <Input
                      placeholder="e.g., RESELLER-"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="bg-input h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add a custom prefix to identify your licenses
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating || !appId}
                    className="w-full h-11"
                    variant="glow"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Create {count} License{count > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Filter Dropdown */}
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="h-10 border-0 bg-transparent hover:bg-primary/15 px-3 w-auto gap-1.5 rounded-none [&>svg]:h-5 [&>svg]:w-5 transition-colors">
                <Filter className="h-5 w-5" />
                <span className="text-xs sm:text-sm font-medium">
                  {filterStatus === 'all' && 'All Licenses'}
                  {filterStatus === 'used' && 'Used Only'}
                  {filterStatus === 'unused' && 'Unused Only'}
                  {filterStatus === 'active' && 'Active Only'}
                  {filterStatus === 'expired' && 'Expired Only'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Licenses</SelectItem>
                <SelectItem value="used">Used Only</SelectItem>
                <SelectItem value="unused">Unused Only</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="expired">Expired Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              disabled={isLoading}
              className="h-10 w-10 rounded-none hover:bg-primary/15 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || filterStatus !== "all") && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                <Search className="h-3 w-3" />
                {searchQuery}
                <button onClick={() => setSearchQuery("")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterStatus !== "all" && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {filterStatus}
                <button onClick={() => setFilterStatus("all")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Data Table */}
        <div className="glass-strong rounded-xl border border-border overflow-hidden overflow-x-auto">
          <DataTable
            columns={columns}
            data={filteredLicenses}
            keyExtractor={(l) => l.id.toString()}
            isLoading={isLoading}
            emptyMessage="No licenses found. Create your first license to get started!"
          />
        </div>
      </div>

      {/* License Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="glass-strong border-border sm:max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">License Details</DialogTitle>
          </DialogHeader>
          {selectedLicense && (
            <div className="space-y-4 sm:space-y-6 pt-4">
              {/* License Key Section */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold">License Key</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <code className="flex-1 font-mono text-xs sm:text-sm bg-muted px-3 sm:px-4 py-2 sm:py-3 rounded-lg break-all border border-border">
                    {selectedLicense.license_key}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                    onClick={() => copyToClipboard(selectedLicense.license_key)}
                    title="Copy"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* HWID Section */}
              {selectedLicense.hwid ? (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold">Hardware ID (HWID)</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <code className="flex-1 font-mono text-xs sm:text-sm bg-muted px-3 sm:px-4 py-2 sm:py-3 rounded-lg break-all border border-border">
                      {selectedLicense.hwid}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold">Hardware ID (HWID)</label>
                  <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-muted border border-border text-xs sm:text-sm text-muted-foreground">
                    No HWID assigned yet. License is unused.
                  </div>
                </div>
              )}

              {/* Product Section */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold">Product</label>
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-muted border border-border">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-primary">
                      {selectedLicense.app_name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <span className="font-medium text-xs sm:text-sm truncate">
                    {selectedLicense.app_name || `App #${selectedLicense.app_id}`}
                  </span>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold">Status</label>
                  <Badge 
                    className="w-full justify-center py-1.5 sm:py-2 text-xs sm:text-sm"
                    variant={selectedLicense.hwid ? (selectedLicense.is_active ? "default" : "secondary") : "secondary"}
                  >
                    {!selectedLicense.hwid ? "Unused" : (selectedLicense.is_active ? "Active" : "Expired")}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold">Created</label>
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-muted border border-border text-xs sm:text-sm">
                    {new Date(selectedLicense.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Expiry Section */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold">Expiry Date</label>
                {selectedLicense.expiry_timestamp ? (
                  <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-muted border border-border">
                    <div className="text-xs sm:text-sm font-medium">
                      {new Date(selectedLicense.expiry_timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedLicense.expiry_timestamp) < new Date() 
                        ? "Expired" 
                        : `${Math.ceil((new Date(selectedLicense.expiry_timestamp).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining`}
                    </div>
                  </div>
                ) : (
                  <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-muted border border-border text-xs sm:text-sm">
                    Never expires
                  </div>
                )}
              </div>

              {/* User ID Section */}
              {selectedLicense.user_id && (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold">User ID</label>
                  <div className="px-3 sm:px-4 py-2 rounded-lg bg-muted border border-border text-xs sm:text-sm font-mono">
                    {selectedLicense.user_id}
                  </div>
                </div>
              )}

              {/* Action Buttons - RESELLER VERSION (Only Reset HWID, No Delete) */}
              <div className="flex gap-2 sm:gap-3 pt-4">
                {selectedLicense.hwid && (
                  <Button
                    onClick={() => {
                      handleResetHwid(selectedLicense.license_key);
                    }}
                    className="flex-1 h-9 sm:h-10"
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Reset HWID</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}