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
import AdminRoute from "./components/AdminRoute";
// Import du AuthProvider
import { AuthProvider } from "./contexts/AuthContext";
import AdminCarDetails from "./pages/AdminCarsDetails";
import { ProtectedRoute } from '@/components/ProtectedRoute';


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider> {/* ← Wrappe toute l’application */}
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/offres" element={<Offres />} />
              <Route path="/ma-reservation" element={<ProtectedRoute> <MaReservation /> </ProtectedRoute>} />
              <Route path="/mon-compte" element={<MonCompte />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
              <Route path="/admin/vehicles" element={<ProtectedRoute adminOnly={true}> <AdminVehicles /> </ProtectedRoute>} />
              <Route path="/admin/vehicle/:id" element={<ProtectedRoute adminOnly={true}> <AdminCarDetails /> </ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
