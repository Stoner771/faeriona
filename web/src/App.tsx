import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ResellerDashboard from "./pages/ResellerDashboard";
import ResellerLicenses from "./pages/ResellerLicenses";
import ResellerTickets from "./pages/ResellerTickets";
import ResellerApplications from "./pages/ResellerApplications";
import ResellerTransactions from "./pages/ResellerTransactions";
import ResellerProfile from "./pages/ResellerProfile";
import Licenses from "./pages/Licenses";
import Users from "./pages/Users";
import Applications from "./pages/Applications";
import Logs from "./pages/Logs";
import Variables from "./pages/Variables";
import Resellers from "./pages/Resellers";
import Tickets from "./pages/Tickets";
import Subscriptions from "./pages/Subscriptions";
import Status from "./pages/Status";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredType="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/licenses"
            element={
              <ProtectedRoute requiredType="admin">
                <Licenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredType="admin">
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute requiredType="admin">
                <Applications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute requiredType="admin">
                <Logs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/variables"
            element={
              <ProtectedRoute requiredType="admin">
                <Variables />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resellers"
            element={
              <ProtectedRoute requiredType="admin">
                <Resellers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute requiredType="admin">
                <Tickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute requiredType="admin">
                <Subscriptions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/status"
            element={
              <ProtectedRoute>
                <Status />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reseller/dashboard"
            element={
              <ProtectedRoute requiredType="reseller">
                <ResellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reseller/licenses"
            element={
              <ProtectedRoute requiredType="reseller">
                <ResellerLicenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reseller/tickets"
            element={
              <ProtectedRoute requiredType="reseller">
                <ResellerTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reseller/applications"
            element={
              <ProtectedRoute requiredType="reseller">
                <ResellerApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reseller/transactions"
            element={
              <ProtectedRoute requiredType="reseller">
                <ResellerTransactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reseller/profile"
            element={
              <ProtectedRoute requiredType="reseller">
                <ResellerProfile />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
