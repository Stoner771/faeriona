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
import {
  getVariables,
  createVariable,
  updateVariable,
  deleteVariable,
  getApplications,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Variable, Copy } from "lucide-react";

interface Var {
  id: number;
  key: string;
  value: string;
  app_id: number;
  created_at: string;
  updated_at: string;
}

interface Application {
  id: number;
  name: string;
}

export default function Variables() {
  const [variables, setVariables] = useState<Var[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVar, setEditVar] = useState<Var | null>(null);
  const { toast } = useToast();

  // Form state
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const fetchApplications = async () => {
    try {
      const data = await getApplications();
      setApplications(data || []);
    } catch (error: any) {
      console.error("[Variables] Error fetching apps:", error);
    }
  };

  const fetchVariables = async (appId: string) => {
    if (!appId) {
      setVariables([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getVariables(parseInt(appId));
      setVariables(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load variables",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchVariables(selectedAppId);
  }, [selectedAppId]);

  const handleSubmit = async () => {
    if (!selectedAppId) {
      toast({
        title: "Select an application",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editVar) {
        await updateVariable(editVar.id.toString(), { key, value });
        toast({ title: "Variable updated" });
      } else {
        await createVariable({ app_id: parseInt(selectedAppId), key, value });
        toast({ title: "Variable created" });
      }
      setDialogOpen(false);
      resetForm();
      fetchVariables(selectedAppId);
    } catch (error: any) {
      toast({
        title: editVar ? "Failed to update" : "Failed to create",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteVariable(id.toString());
      toast({ title: "Variable deleted" });
      fetchVariables(selectedAppId);
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setKey("");
    setValue("");
    setEditVar(null);
  };

  const openEdit = (v: Var) => {
    setEditVar(v);
    setKey(v.key);
    setValue(v.value);
    setDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const columns = [
    {
      key: "key",
      header: "Key",
      render: (v: Var) => (
        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {v.key}
        </code>
      ),
    },
    {
      key: "value",
      header: "Value",
      render: (v: Var) => (
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm bg-muted px-2 py-1 rounded max-w-xs truncate">
            {v.value}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => copyToClipboard(v.value)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      render: (v: Var) => (
        <span className="text-sm text-muted-foreground">
          {new Date(v.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (v: Var) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(v)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(v.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Variables"
      subtitle="Manage application variables and configs"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Variable className="h-5 w-5 text-primary" />
            <Select value={selectedAppId} onValueChange={setSelectedAppId}>
              <SelectTrigger className="w-64 bg-input">
                <SelectValue placeholder="Select an application" />
              </SelectTrigger>
              <SelectContent>
                {applications.map((app) => (
                  <SelectItem key={app.id} value={app.id.toString()}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">
              {variables.length} variables
            </span>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="glow" disabled={!selectedAppId}>
                <Plus className="mr-2 h-4 w-4" />
                Add Variable
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-border">
              <DialogHeader>
                <DialogTitle>
                  {editVar ? "Edit Variable" : "Add Variable"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Input
                    placeholder="VARIABLE_NAME"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="bg-input font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    placeholder="variable_value"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="bg-input font-mono"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" variant="glow">
                  {editVar ? "Update" : "Create"} Variable
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          columns={columns}
          data={variables}
          keyExtractor={(v) => v.id.toString()}
          isLoading={isLoading}
          emptyMessage={selectedAppId ? "No variables configured for this app" : "Select an application to view variables"}
        />
      </div>
    </DashboardLayout>
  );
}
