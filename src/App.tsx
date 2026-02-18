import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import MobileLayout from "@/components/MobileLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Finances from "./pages/Finances";
import Clients from "./pages/Clients";
import Inventory from "./pages/Inventory";
import Challenge from "./pages/Challenge";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <MobileLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/finanzas" element={<Finances />} />
        <Route path="/clientas" element={<Clients />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/mi-reto" element={<Challenge />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MobileLayout>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
