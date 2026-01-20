import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/lib/api";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredType?: "admin" | "reseller";
}

export const ProtectedRoute = ({ children, requiredType }: ProtectedRouteProps) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  if (requiredType) {
    const userType = localStorage.getItem("faerion_user_type");
    if (userType !== requiredType) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
