import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { resellerGetApps } from "@/lib/api";
import { AppWindow, Key, CheckCircle, Info, ArrowRight, Search, FileText, RotateCcw, Trash2, Lightbulb, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  description?: string;
  version: string;
  status?: "active" | "inactive" | "maintenance";
  created_at: string;
  licenses_count?: number;
  secret?: string;
}

export default function ResellerApplications() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      console.log("[ResellerApplications] Fetching products...");
      const data = await resellerGetApps();
      console.log("[ResellerApplications] Data received", data);
      setProducts(data || []);
    } catch (err: any) {
      console.error("[ResellerApplications] Error", err);
      toast({
        title: "Failed to load products",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.version.includes(searchQuery)
  );

  if (isLoading) {
    return (
      <DashboardLayout
        title="My Products"
        subtitle="View your assigned products"
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-strong rounded-xl p-6 h-64 animate-pulse border border-border" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Products"
      subtitle="View your assigned products and create licenses"
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <AppWindow className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/reseller/licenses")}
            variant="glow" 
            size="lg"
            className="gap-2"
          >
            <Key className="h-5 w-5" />
            Manage Licenses
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search products by name or version..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border/50"
          />
        </div>

        {/* Products Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((app) => (
              <div
                key={app.id}
                className="glass rounded-xl p-6 transition-all duration-300 hover:shadow-lg border border-border/30 hover:border-border/50 group"
              >
                {/* App Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">v{app.version}</p>
                  </div>
                  <Badge variant="default" className="whitespace-nowrap">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>

                {/* Info Section */}
                <div className="space-y-3 mb-4 p-3 rounded-lg bg-muted/20 border border-border/20">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Product ID</span>
                    </div>
                    <span className="font-mono text-xs font-medium bg-input px-2 py-1 rounded">
                      #{app.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created</span>
                    </div>
                    <span className="font-medium text-xs">
                      {new Date(app.created_at).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric',
                        year: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Status</span>
                    </div>
                    <Badge variant="secondary">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Ready
                      </div>
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                {app.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {app.description}
                  </p>
                )}

                {/* Action Button */}
                <div className="flex gap-2 pt-4 border-t border-border/20">
                  <Button
                    onClick={() => navigate("/reseller/licenses")}
                    className="flex-1 gap-2"
                    variant="outline"
                    size="sm"
                  >
                    <Key className="h-4 w-4" />
                    Create License
                  </Button>
                  <Dialog open={infoDialogOpen && selectedProduct?.id === app.id} onOpenChange={(open) => {
                    setInfoDialogOpen(open);
                    if (open) setSelectedProduct(app);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        title="How to access"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass border-border sm:max-w-xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AppWindow className="h-5 w-5" />
                          How to Use - {selectedProduct?.name}
                        </DialogTitle>
                      </DialogHeader>
                      <Tabs defaultValue="quick" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="quick">Quick Start</TabsTrigger>
                          <TabsTrigger value="create">Create Keys</TabsTrigger>
                          <TabsTrigger value="manage">Manage</TabsTrigger>
                        </TabsList>

                        {/* Quick Start Tab */}
                        <TabsContent value="quick" className="space-y-3 pt-4">
                          <div className="space-y-2">
                            <div className="flex gap-2 text-sm">
                              <span className="font-semibold text-primary min-w-6">1.</span>
                              <span>Create a license key for this app</span>
                            </div>
                            <div className="flex gap-2 text-sm">
                              <span className="font-semibold text-primary min-w-6">2.</span>
                              <span>Copy the generated key</span>
                            </div>
                            <div className="flex gap-2 text-sm">
                              <span className="font-semibold text-primary min-w-6">3.</span>
                              <span>Send to your customer</span>
                            </div>
                            <div className="flex gap-2 text-sm">
                              <span className="font-semibold text-primary min-w-6">4.</span>
                              <span>Customer runs app and enters key</span>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                            <div className="flex gap-2">
                              <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground">
                                Your customer will need to enter the key when they launch the application.
                              </p>
                            </div>
                          </div>
                        </TabsContent>

                        {/* Create Licenses Tab */}
                        <TabsContent value="create" className="space-y-3 pt-4">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">Steps:</p>
                            <ol className="space-y-2 text-sm">
                              <li className="flex gap-2">
                                <span className="font-semibold text-primary min-w-6">1.</span>
                                <span>Go to <span className="font-semibold">Licenses</span> in sidebar</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-primary min-w-6">2.</span>
                                <span>Click <span className="font-semibold">"Create Licenses"</span></span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-primary min-w-6">3.</span>
                                <span>Select: <span className="font-mono bg-muted px-1 rounded text-xs">{selectedProduct?.name}</span></span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-primary min-w-6">4.</span>
                                <span>Set expiry days (e.g., 30, 90, 365)</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-semibold text-primary min-w-6">5.</span>
                                <span>Click <span className="font-semibold">"Create"</span> button</span>
                              </li>
                            </ol>
                          </div>
                        </TabsContent>

                        {/* Manage Tab */}
                        <TabsContent value="manage" className="space-y-3 pt-4">
                          <div className="space-y-3 text-sm">
                            <div className="flex gap-2 items-start">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold">View Keys</p>
                                <p className="text-muted-foreground text-xs">See all your created keys in the table with status and expiry date</p>
                              </div>
                            </div>
                            <div className="flex gap-2 items-start">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold">Copy Key</p>
                                <p className="text-muted-foreground text-xs">Click copy button next to any key to copy it to clipboard</p>
                              </div>
                            </div>
                            <div className="flex gap-2 items-start">
                              <RotateCcw className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold">Reset HWID</p>
                                <p className="text-muted-foreground text-xs">If customer changes PC, reset HWID to reuse the same key</p>
                              </div>
                            </div>
                            <div className="flex gap-2 items-start">
                              <Search className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold">Search & Filter</p>
                                <p className="text-muted-foreground text-xs">Use filters to find active, expired, used, or unused keys quickly</p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>

                      <Button
                        onClick={() => {
                          navigate("/reseller/licenses");
                          setInfoDialogOpen(false);
                        }}
                        className="w-full mt-4"
                        variant="glow"
                        size="sm"
                      >
                        Go to Licenses →
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full glass rounded-xl p-12 text-center border border-border/30">
              <div className="p-4 rounded-full bg-muted/20 w-fit mx-auto mb-4">
                <AppWindow className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search"
                  : "You haven't been assigned any products yet. Contact your admin."}
              </p>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="glass rounded-xl p-4 border border-border/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Getting Started</h4>
              <p className="text-sm text-muted-foreground">
                1. Click the info button on any product to see step-by-step instructions
              </p>
              <p className="text-sm text-muted-foreground">
                2. Go to Licenses section to create and manage your license keys
              </p>
              <p className="text-sm text-muted-foreground">
                3. Distribute keys to your customers
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
