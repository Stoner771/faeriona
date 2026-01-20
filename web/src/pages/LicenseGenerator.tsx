import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateLicenseKey, getApplications, getResellers } from "@/lib/api";
import { Plus, Copy, CheckCircle } from "lucide-react";

interface Application {
  id: number;
  name: string;
}

interface Reseller {
  id: string;
  username: string;
}

interface GeneratedKey {
  license_key: string;
  reseller?: string;
  app_name?: string;
  expires_at?: string;
  created_at: string;
}

export default function LicenseGenerator() {
  const [apps, setApps] = useState<Application[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<GeneratedKey[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [appId, setAppId] = useState<string>("");
  const [resellerId, setResellerId] = useState<string>("");
  const [durationDays, setDurationDays] = useState(30);
  const [username, setUsername] = useState("");
  const [hwid, setHwid] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [appsData, resellersData] = await Promise.all([
          getApplications(),
          getResellers(),
        ]);
        setApps(appsData || []);
        setResellers(resellersData || []);
      } catch (error: any) {
        toast({
          title: "Failed to load data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleGenerateKey = async () => {
    if (!appId || !durationDays) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generateLicenseKey({
        app_id: parseInt(appId),
        duration_days: durationDays,
        reseller_id: resellerId || undefined,
        username: username || undefined,
        hwid: hwid || undefined,
      });

      const selectedApp = apps.find((a) => a.id === parseInt(appId));
      const selectedReseller = resellers.find((r) => r.id === resellerId);

      const newKey: GeneratedKey = {
        license_key: result.license_key || result.key,
        app_name: selectedApp?.name,
        reseller: selectedReseller?.username,
        expires_at: result.expires_at || result.expiry_timestamp,
        created_at: new Date().toISOString(),
      };

      setGeneratedKeys([newKey, ...generatedKeys]);
      toast({
        title: "Success",
        description: "License key generated successfully",
      });

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Failed to generate key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setAppId("");
    setResellerId("");
    setDurationDays(30);
    setUsername("");
    setHwid("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="License Generator" subtitle="Generate new license keys">
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="License Generator" subtitle="Generate and manage license keys">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" variant="glow">
                <Plus className="h-4 w-4" />
                Generate New Key
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-border max-w-md">
              <DialogHeader>
                <DialogTitle>Generate License Key</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Application *</Label>
                  <select
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className="w-full px-3 py-2 mt-1 rounded-lg border border-input bg-input text-foreground"
                  >
                    <option value="">Select an application...</option>
                    {apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Duration (Days) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value))}
                    className="bg-input"
                  />
                </div>

                <div>
                  <Label>Reseller (Optional)</Label>
                  <select
                    value={resellerId}
                    onChange={(e) => setResellerId(e.target.value)}
                    className="w-full px-3 py-2 mt-1 rounded-lg border border-input bg-input text-foreground"
                  >
                    <option value="">For direct customer...</option>
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Username (Optional)</Label>
                  <Input
                    placeholder="Customer username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-input"
                  />
                </div>

                <div>
                  <Label>HWID (Optional)</Label>
                  <Input
                    placeholder="Hardware ID"
                    value={hwid}
                    onChange={(e) => setHwid(e.target.value)}
                    className="bg-input"
                  />
                </div>

                <Button
                  onClick={handleGenerateKey}
                  disabled={isGenerating}
                  className="w-full"
                  variant="glow"
                >
                  {isGenerating ? "Generating..." : "Generate Key"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {generatedKeys.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recently Generated</h3>
            <div className="space-y-2">
              {generatedKeys.map((key, idx) => (
                <div
                  key={idx}
                  className="glass rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {key.app_name && (
                        <Badge variant="outline">{key.app_name}</Badge>
                      )}
                      {key.reseller && (
                        <Badge variant="secondary">{key.reseller}</Badge>
                      )}
                    </div>
                    <code className="text-xs font-mono text-muted-foreground block truncate">
                      {key.license_key}
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generated {new Date(key.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(key.license_key)}
                    className="ml-2 text-green-500 hover:text-green-600"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {generatedKeys.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No keys generated yet</h3>
            <p className="text-muted-foreground">
              Generate your first license key using the button above
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
