import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, AppWindow, Copy, Eye, EyeOff, Lock, CheckCircle, Search, AlertCircle, RefreshCw } from "lucide-react";

interface Application {
  id: string;
  name: string;
  secret?: string;
  version: string;
  force_update: boolean;
  created_at: string;
}

export default function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [forceUpdate, setForceUpdate] = useState(false);

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const response = await getApplications();
      setApps(response.apps || response || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, []);

  const handleSubmit = async () => {
    try {
      if (editApp) {
        await updateApplication(editApp.id, { name, version, force_update: forceUpdate });
      } else {
        await createApplication({ name, version, force_update: forceUpdate });
      }
      toast({ title: editApp ? "Updated" : "Created" });
      setDialogOpen(false);
      resetForm();
      fetchApps();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApplication(id);
      toast({ title: "Deleted" });
      fetchApps();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => { setName(""); setVersion("1.0.0"); setForceUpdate(false); setEditApp(null); };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredApps = apps.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DashboardLayout title="Applications">
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Applications</h1>
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if(!o) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2" />Create App</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editApp ? "Edit" : "Create"} Application</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
                <Input placeholder="Version" value={version} onChange={e => setVersion(e.target.value)} />
                <Button onClick={handleSubmit} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map(app => (
            <Card key={app.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div><h3 className="font-bold">{app.name}</h3><p className="text-sm text-muted-foreground">v{app.version}</p></div>
                <Badge>{app.force_update ? "Force Update" : "Current"}</Badge>
              </div>
              {app.secret && (
                <div className="bg-muted p-2 rounded flex items-center justify-between mb-4">
                  <code className="text-xs">{showSecret[app.id] ? app.secret : "••••••••"}</code>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setShowSecret({...showSecret, [app.id]: !showSecret[app.id]})}>{showSecret[app.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    <Button size="icon" variant="ghost" onClick={() => copyToClipboard(app.secret!, app.id)}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" size="sm" onClick={() => { setEditApp(app); setName(app.name); setVersion(app.version); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(app.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
