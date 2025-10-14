// App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Offres from "./pages/Offres";
import MaReservation from "./pages/MaReservation";
import MonCompte from "./pages/MonCompte";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import AdminVehicles from "./pages/AdminVehicules";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminProvider } from "./contexts/AdminContext";
import AdminCarDetails from "./pages/AdminCarsDetails";
import AdminAuth from '@/pages/AdminAuth';
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute';
import { Header } from '@/components/Header';

const queryClient = new QueryClient();

// Créer un composant qui combine les providers
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <AdminProvider>
        {children}
      </AdminProvider>
    </AuthProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProviders>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Header />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/offres" element={<Offres />} />
              <Route path="/ma-reservation" element={<MaReservation />} />
              <Route path="/mon-compte" element={<MonCompte />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
              
              <Route path="/admin" element={<AdminAuth />} />
              <Route 
                path="/admin/vehicles" 
                element={
                  <ProtectedAdminRoute>
                    <AdminVehicles />
                  </ProtectedAdminRoute>
                } 
              />
              <Route 
                path="/admin/vehicle/:id" 
                element={
                  <ProtectedAdminRoute>
                    <AdminCarDetails />
                  </ProtectedAdminRoute>
                } 
              />
            </Routes>
          </TooltipProvider>
        </AppProviders>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;