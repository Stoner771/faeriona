import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { resellerGetProfile } from "@/lib/api";
import { Mail, Building2, Calendar, Shield, Edit } from "lucide-react";

interface Profile {
  id: number;
  username: string;
  email: string;
  company_name?: string;
  credits: number;
  is_verified: boolean;
  created_at: string;
  last_login?: string;
}

export default function ResellerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        console.log("ResellerProfile: Fetching profile...");
        const data = await resellerGetProfile();
        console.log("ResellerProfile: Data received", data);
        setProfile(data);
        setError(null);
      } catch (err: any) {
        console.error("ResellerProfile: Error", err);
        const errorMsg = err.message || "Failed to load profile";
        setError(errorMsg);
        toast({
          title: "Failed to load profile",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  if (isLoading) {
    return (
      <DashboardLayout title="My Profile" subtitle="Manage your profile">
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout title="My Profile" subtitle="Manage your profile">
        <div className="glass rounded-xl p-6 border border-red-500/50 bg-red-500/10">
          <p className="text-red-500">{error || "Failed to load profile"}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Profile" subtitle="View and manage your account">
      <div className="space-y-6">
        {/* Main Profile Card */}
        <div className="glass rounded-xl p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">{profile.username}</h2>
              <p className="text-muted-foreground mt-1">Reseller Account</p>
            </div>
            <Badge variant={profile.is_verified ? "default" : "secondary"}>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {profile.is_verified ? "Verified" : "Unverified"}
              </div>
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Email */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>

            {/* Company */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{profile.company_name || "Not set"}</p>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Credits */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-2xl font-bold text-primary">💰</div>
              <div>
                <p className="text-sm text-muted-foreground">Available Credits</p>
                <p className="font-bold text-lg">{typeof profile.credits === 'number' ? profile.credits.toFixed(2) : profile.credits}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono">{profile.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-muted">
              <span className="text-muted-foreground">Account Status</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Last Login</span>
              <span>
                {profile.last_login
                  ? new Date(profile.last_login).toLocaleString()
                  : "Never"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button disabled className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline" disabled>
            Change Password
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
