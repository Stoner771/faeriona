import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Key,
  Users,
  AppWindow,
  FileText,
  Variable,
  UserCog,
  MessageSquare,
  LogOut,
  ChevronLeft,
  Activity,
  Settings,
  Menu,
  X,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { clearAuth, getAuth } from "@/lib/api";
import faerionLogo from "@/assets/faerion-logo.png";

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Key, label: "Licenses", path: "/licenses" },
  { icon: Users, label: "Users", path: "/users" },
  { icon: AppWindow, label: "Applications", path: "/applications" },
  { icon: CreditCard, label: "Subscriptions", path: "/subscriptions" },
  { icon: FileText, label: "Logs", path: "/logs" },
  { icon: Variable, label: "Variables", path: "/variables" },
  { icon: UserCog, label: "Resellers", path: "/resellers" },
  { icon: MessageSquare, label: "Tickets", path: "/tickets" },
];

const resellerNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/reseller/dashboard" },
  { icon: Key, label: "Licenses", path: "/reseller/licenses" },
  { icon: AppWindow, label: "Products", path: "/reseller/applications" },
  { icon: MessageSquare, label: "Tickets", path: "/reseller/tickets" },
  { icon: FileText, label: "Transactions", path: "/reseller/transactions" },
  { icon: Settings, label: "Profile", path: "/reseller/profile" },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userType } = getAuth();

  const logoPath = userType === "reseller" ? "/reseller/dashboard" : "/dashboard";

  const navItems = userType === "reseller" ? resellerNavItems : adminNavItems;

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border/40 bg-background/98 px-4 backdrop-blur-xl shadow-sm lg:hidden">
        <Link to={logoPath} className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <img src={faerionLogo} alt="Faerion Logo" className="h-7 w-7 object-contain" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            Faerion
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="hover:bg-accent/80 text-foreground"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-[70] h-screen bg-card/95 backdrop-blur-xl transition-all duration-300 border-r border-border/50 shadow-xl",
          mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
          !mobileOpen && (collapsed ? "lg:w-20" : "lg:w-64")
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo Header */}
          <div className="flex h-20 items-center px-4 border-b border-border/50 shrink-0 bg-background/40">
            <Link to={logoPath} className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                <img src={faerionLogo} alt="Faerion Logo" className="h-7 w-7 object-contain" />
              </div>
              <span 
                className={cn(
                  "text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent transition-all duration-300 whitespace-nowrap",
                  (collapsed && !mobileOpen) ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                Faerion
              </span>
            </Link>
          </div>

          {/* Toggle Button - Outside Header */}
          {!mobileOpen && (
            <div className="hidden lg:flex justify-end px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-all duration-300 rounded-lg border border-border/50"
              >
                {collapsed ? (
                  <Menu className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 group relative",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground border border-transparent"
                  )}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  <item.icon 
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive && "text-emerald-400"
                    )} 
                  />
                  <span 
                    className={cn(
                      "font-medium whitespace-nowrap transition-all duration-300",
                      (collapsed && !mobileOpen) ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-border/50 p-3 space-y-1.5 mt-auto shrink-0 bg-background/40">
            {userType === "admin" && (
              <Link
                to="/status"
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-all duration-200 border border-transparent hover:border-border/50"
                title={collapsed && !mobileOpen ? "System Status" : undefined}
              >
                <Activity className="h-5 w-5 shrink-0" />
                <span 
                  className={cn(
                    "font-medium whitespace-nowrap transition-all duration-300",
                    (collapsed && !mobileOpen) ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}
                >
                  System Status
                </span>
              </Link>
            )}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-red-400 hover:text-red-400 hover:bg-red-500/10 px-3.5 py-3 h-auto rounded-xl border border-transparent hover:border-red-500/30 transition-all duration-200",
                collapsed && !mobileOpen && "justify-center px-0"
              )}
              onClick={handleLogout}
              title={collapsed && !mobileOpen ? "Logout" : undefined}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span 
                className={cn(
                  "font-medium whitespace-nowrap transition-all duration-300",
                  (collapsed && !mobileOpen) ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                Logout
              </span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};