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
import About from "./pages/About";

import AdminVehicles from "./pages/AdminVehicules";
import AdminCarDetails from "./pages/AdminCarsDetails";
import AdminAuth from './pages/AdminAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import AdminUsers from "./pages/AdminUsers";
import AdminReservations from "./pages/AdminReservations";
// import './i18n';

const queryClient = new QueryClient();

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

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
              {/* Site client */}
              <Route path="/" element={<Index />} />
              <Route path="/offres" element={<Offres />} />
              <Route path="/ma-reservation" element={<MaReservation />} />
              <Route path="/mon-compte" element={<MonCompte />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/about" element={<About />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminAuth />} />
              <Route 
                path="/admin/vehicles" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminVehicles />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/vehicle/:id" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminCarDetails />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/reservations" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminReservations />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminUsers />
                  </ProtectedRoute>
                } 
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AppProviders>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
