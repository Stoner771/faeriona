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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getUsers, deleteUser, banUser, unbanUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Users as UsersIcon, Ban, ShieldCheck, Trash2, Eye, RefreshCw, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  email?: string;
  license_key?: string;
  subscription_name?: string;
  expiry_timestamp?: string;
  account_creation_date: string;
  last_login_time?: string;
  is_banned: boolean;
  ban_reason?: string;
  user_id?: number;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedLicense, setCopiedLicense] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const copyToClipboard = (text: string, kind: "username" | "license" = "username") => {
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
      
      if (kind === "username") {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else {
        setCopiedLicense(true);
        setTimeout(() => setCopiedLicense(false), 2000);
      }
      
      toast({ 
        title: "✓ Copied!",
        description: kind === "username" ? "Username copied" : "License key copied"
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

  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id.toString());
      toast({ title: "User deleted" });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBan = async () => {
    if (!selectedUser) return;
    try {
      await banUser(selectedUser.id.toString(), banReason);
      toast({ title: "User banned" });
      setBanDialogOpen(false);
      setBanReason("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Failed to ban user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnban = async (id: number) => {
    try {
      await unbanUser(id.toString());
      toast({ title: "User unbanned" });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Failed to unban user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      key: "username",
      header: "PC Username",
      render: (user: User) => {
        const isLicenseFallback = user.username.startsWith("license_");
        return (
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isLicenseFallback 
                ? 'bg-yellow-100/30 border border-yellow-200' 
                : 'bg-primary/20'
            }`}>
              <span className={`text-xs font-bold ${
                isLicenseFallback ? 'text-yellow-600' : 'text-primary'
              }`}>
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={`font-medium text-sm ${
                isLicenseFallback ? 'text-yellow-700' : ''
              }`}>
                {user.username}
              </span>
              {isLicenseFallback && (
                <span className="text-xs text-yellow-600">
                  ⚠️ Recompile C++ client
                </span>
              )}
              {user.subscription_name && (
                <span className="text-xs text-muted-foreground">{user.subscription_name}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "license",
      header: "License Key",
      render: (user: User) => (
        <div className="flex items-center gap-2">
          {user.license_key ? (
            <>
              <code className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border max-w-sm truncate">
                {user.license_key}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(user.license_key || '', 'license');
                }}
                title="Copy license key"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user: User) => (
        <Badge 
          variant={user.is_banned ? "destructive" : "default"}
          className="w-fit text-xs"
        >
          {user.is_banned ? "🚫 Banned" : "✓ Active"}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Joined",
      render: (user: User) => (
        <span className="text-xs text-muted-foreground">
          {new Date(user.account_creation_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (user: User) => (
        <span className="text-xs text-muted-foreground">
          {user.last_login_time 
            ? new Date(user.last_login_time).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (user: User) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedUser(user);
              setDetailsOpen(true);
            }}
            title="View details"
            className="h-8 w-8"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {user.is_banned ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleUnban(user.id)}
              title="Unban user"
              className="h-8 w-8"
            >
              <ShieldCheck className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedUser(user);
                setBanDialogOpen(true);
              }}
              title="Ban user"
              className="h-8 w-8"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(user.id)}
            className="h-8 w-8"
            title="Delete user"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const bannedUsers = users.filter(u => u.is_banned).length;
  const activeUsers = users.filter(u => !u.is_banned).length;
  const licenseFallbackUsers = users.filter(u => u.username.startsWith("license_")).length;

  return (
    <DashboardLayout
      title="Users"
      subtitle="Manage registered users and accounts"
    >
      <div className="space-y-6">
        {/* Warning Banner for License Fallback Users */}
        {licenseFallbackUsers > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-yellow-600 mt-0.5">⚠️</div>
            <div className="flex-1">
              <p className="font-semibold text-yellow-800">
                {licenseFallbackUsers} user{licenseFallbackUsers !== 1 ? 's' : ''} using fallback license-based username
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                These users need to recompile and re-run the C++ client to capture their actual PC username. 
                <br />
                See the highlighted usernames below and ask them to recompile their application.
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-strong p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold mt-2">{users.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-strong p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-3xl font-bold mt-2">{activeUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="glass-strong p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Banned</p>
                <p className="text-3xl font-bold mt-2">{bannedUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ban className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchUsers}
            disabled={isLoading}
            className="h-10 w-10"
            title="Refresh users list"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Data Table */}
        <div className="glass-strong rounded-xl border border-border overflow-hidden">
          <DataTable
            columns={columns}
            data={users}
            keyExtractor={(u) => u.id.toString()}
            isLoading={isLoading}
            emptyMessage="No users found"
          />
        </div>

        {/* Ban Dialog */}
        <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <DialogContent className="glass-strong border-border">
            <DialogHeader>
              <DialogTitle>Ban User: {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Ban Reason</Label>
                <Input
                  placeholder="Enter reason for ban"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="bg-input"
                />
              </div>
              <Button
                onClick={handleBan}
                className="w-full"
                variant="destructive"
              >
                Confirm Ban
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="glass-strong border-border sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6 pt-4">
                {/* Username Section */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Username</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm bg-muted px-4 py-3 rounded-lg break-all border border-border">
                      {selectedUser.username}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 transition-colors flex-shrink-0",
                        copiedUsername && "bg-green-100 text-green-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(selectedUser.username, 'username');
                      }}
                      title="Copy username"
                    >
                      {copiedUsername ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Email Section */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">License Key</label>
                  {selectedUser.license_key ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm bg-muted px-4 py-3 rounded-lg break-all border border-border">
                        {selectedUser.license_key}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 transition-colors flex-shrink-0",
                          copiedLicense && "bg-green-100 text-green-700"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(selectedUser.license_key || '', 'license');
                        }}
                        title="Copy license key"
                      >
                        {copiedLicense ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="px-4 py-3 rounded-lg bg-muted border border-border text-sm text-muted-foreground">
                      No license assigned
                    </div>
                  )}
                </div>

                {/* Status Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Account Status</label>
                    <Badge 
                      className="w-full justify-center py-2"
                      variant={selectedUser.is_banned ? "destructive" : "default"}
                    >
                      {selectedUser.is_banned ? "🚫 Banned" : "✓ Active"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Account ID</label>
                    <div className="px-4 py-2 rounded-lg bg-muted border border-border text-sm font-mono">
                      #{selectedUser.id}
                    </div>
                  </div>
                </div>

                {/* Dates Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Joined</label>
                    <div className="px-4 py-3 rounded-lg bg-muted border border-border">
                      <div className="text-sm font-medium">
                        {new Date(selectedUser.account_creation_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(selectedUser.account_creation_date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Last Login</label>
                    <div className="px-4 py-3 rounded-lg bg-muted border border-border">
                      {selectedUser.last_login_time ? (
                        <>
                          <div className="text-sm font-medium">
                            {new Date(selectedUser.last_login_time).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(selectedUser.last_login_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">Never logged in</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscription Info */}
                {selectedUser.subscription_name && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Subscription</label>
                    <div className="px-4 py-3 rounded-lg bg-muted border border-border">
                      <div className="text-sm font-medium">{selectedUser.subscription_name}</div>
                      {selectedUser.expiry_timestamp && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Expires: {new Date(selectedUser.expiry_timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ban Reason */}
                {selectedUser.ban_reason && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Ban Reason</label>
                    <div className="px-4 py-3 rounded-lg bg-muted border border-border">
                      <p className="text-sm font-medium">
                        {selectedUser.ban_reason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  {selectedUser.is_banned ? (
                    <Button
                      onClick={() => {
                        setDetailsOpen(false);
                        handleUnban(selectedUser.id);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Unban User
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setDetailsOpen(false);
                        setBanDialogOpen(true);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Ban User
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setDetailsOpen(false);
                      handleDelete(selectedUser.id);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
