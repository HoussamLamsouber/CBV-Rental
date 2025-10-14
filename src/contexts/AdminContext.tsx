// src/contexts/AdminContext.tsx - Version simplifiée
import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

interface AdminContextType {
  isAdminMode: boolean;
  enterAdminMode: () => void;
  exitAdminMode: () => void;
  isUserAdmin: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { role, loading: authLoading } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);

  console.log("🔧 AdminContext: authLoading", authLoading, "role", role);

  const isUserAdmin = role === 'admin';

  useEffect(() => {
    if (!authLoading) {
      console.log("🔧 AdminContext: Initialisation avec rôle", role);
      const savedMode = sessionStorage.getItem('adminMode');
      
      if (savedMode === 'true' && isUserAdmin) {
        console.log("🔧 AdminContext: Mode admin restauré");
        setIsAdminMode(true);
      } else {
        console.log("🔧 AdminContext: Mode client par défaut");
        setIsAdminMode(false);
      }
    }
  }, [authLoading, isUserAdmin, role]);

  const enterAdminMode = () => {
    if (isUserAdmin) {
      console.log("🔧 AdminContext: Activation mode admin");
      setIsAdminMode(true);
      sessionStorage.setItem('adminMode', 'true');
    } else {
      console.log("🔧 AdminContext: Impossible d'activer - pas admin");
    }
  };

  const exitAdminMode = () => {
    console.log("🔧 AdminContext: Désactivation mode admin");
    setIsAdminMode(false);
    sessionStorage.removeItem('adminMode');
  };

  const value = {
    isAdminMode,
    enterAdminMode,
    exitAdminMode,
    isUserAdmin
  };

  console.log("🔧 AdminContext: Valeur retournée", value);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};