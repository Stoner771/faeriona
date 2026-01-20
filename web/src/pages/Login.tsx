import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, User, ArrowRight, Loader2, LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin, resellerLogin, setAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import faerionLogo from "@/assets/faerion-logo.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      let loginType: "admin" | "reseller" = "admin";

      // Try admin login first
      try {
        response = await adminLogin(username, password);
        loginType = "admin";
      } catch (adminError) {
        // If admin login fails, try reseller login
        try {
          response = await resellerLogin(username, password);
          loginType = "reseller";
        } catch (resellerError) {
          // Both failed
          throw new Error("Invalid username or password");
        }
      }

      console.log("[Login] Response received:", response);

      const token = response.token;

      if (!token) {
        console.error("[Login] ERROR: No token found in response!");
        throw new Error("No token in login response");
      }

      console.log("[Login] Token received, storing in auth...");
      setAuth(token, loginType);

      console.log("[Login] Auth token set. Redirecting to", loginType, "dashboard");

      toast({
        title: "Welcome back!",
        description: `Logged in successfully`,
      });

      navigate(loginType === "admin" ? "/dashboard" : "/reseller/dashboard");
    } catch (error: any) {
      console.error("[Login Error]:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl"
          animate={{ 
            y: [0, 30, 0],
            x: [0, 20, 0]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl"
          animate={{ 
            y: [0, -30, 0],
            x: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-strong rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 backdrop-blur-xl">
          {/* Header Section */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2, damping: 15 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg" />
              <img
                src={faerionLogo}
                alt="Faerion"
                className="h-20 w-20 object-contain relative"
              />
            </motion.div>
          </div>

          {/* Login Form */}
          <motion.form
            onSubmit={handleLogin}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Username Field */}
            <div className="space-y-2.5">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-12 h-12 bg-input/50 border-border/50 hover:border-border focus:border-primary focus:bg-input/80 transition-all rounded-xl"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 bg-input/50 border-border/50 hover:border-border focus:border-primary focus:bg-input/80 transition-all rounded-xl"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="glow"
              size="lg"
              className="w-full h-12 text-base font-semibold rounded-xl"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.form>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 pt-6 border-t border-border/30 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span>Powered by Faerion | Dashboard + Portal</span>
            </div>
          </motion.div>
        </div>

        {/* Optional: Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center text-xs sm:text-sm text-muted-foreground"
        >
        </motion.div>
      </motion.div>
    </div>
  );
}
