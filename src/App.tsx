import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CustomizationProvider } from "@/context/CustomizationContext";
import { SupabaseAuthProvider } from "@/context/SupabaseAuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { PWAUpdateListener } from "@/components/PWAUpdateListener";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <CustomizationProvider>
        <SupabaseAuthProvider>
          <TooltipProvider>
            <PWAUpdateListener />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/admin" element={<Admin />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SupabaseAuthProvider>
      </CustomizationProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
