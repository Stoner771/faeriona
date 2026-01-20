import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  // Listen for sidebar state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved !== null) {
        setCollapsed(JSON.parse(saved));
      }
    };

    // Initial check
    handleStorageChange();

    // Setup listener
    window.addEventListener("storage", handleStorageChange);
    
    // Custom event for same-window updates
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <main 
        className={cn(
          "transition-all duration-300 min-h-screen flex flex-col",
          collapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <div className="p-4 lg:p-8 flex-1">
          <header className="mb-8 mt-14 lg:mt-0 animate-fade-in flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-muted-foreground">{subtitle}</p>
            )}
          </header>
          <div className="animate-slide-up overflow-x-hidden">{children}</div>
        </div>
      </main>
    </div>
  );
};
