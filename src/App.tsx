import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { useCustomDomain } from "@/hooks/useCustomDomain";
import { useBranding } from "@/hooks/useBranding";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import PhoneVerification from "./pages/PhoneVerification";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Dashboard from "./pages/user/Dashboard";
import Profile from "./pages/user/Profile";
import Settings from "./pages/user/Settings";
import Storefront from "./pages/Storefront";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentCallback from "./pages/PaymentCallback";
import CustomerAuth from "./pages/CustomerAuth";
import NotFound from "./pages/NotFound";
import CustomerProfile from "./pages/CustomerProfile";
import { FlowBuilderPage } from "./pages/user/FlowBuilderPage";
import LiveChatWindow from "./pages/LiveChatWindow";
import PageBuilderWindow from "./pages/PageBuilderWindow";
import FormBuilderWindow from "./pages/FormBuilderWindow";
import PublicForm from "./pages/PublicForm";
import CustomerAddressForm from "./pages/CustomerAddressForm";
import InvoicePayment from "./pages/InvoicePayment";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import DataDeletion from "./pages/DataDeletion";
import HelpCenter from "./pages/HelpCenter";
import CookieConsent from "./components/CookieConsent";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  
  return <>{children}</>;
};

const CustomDomainRouter = () => {
  const { isCustomDomain, isLoading } = useCustomDomain();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  // If on custom domain, show storefront at root
  if (isCustomDomain) {
    return <Storefront />;
  }
  
  // Otherwise show default index
  return <Index />;
};

const AppContent = () => {
  useBranding(); // Load and apply branding settings
  
  return (
    <BrowserRouter>
            <CookieConsent />
            <Routes>
              <Route path="/" element={<CustomDomainRouter />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-phone" element={<ProtectedRoute><PhoneVerification /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/customer-auth" element={<CustomerAuth />} />
              <Route path="/customer-profile" element={<CustomerProfile />} />
              <Route path="/flow-builder/:flowId" element={<ProtectedRoute><FlowBuilderPage /></ProtectedRoute>} />
              <Route path="/live-chat" element={<ProtectedRoute><LiveChatWindow /></ProtectedRoute>} />
              <Route path="/page-builder" element={<ProtectedRoute><PageBuilderWindow /></ProtectedRoute>} />
              <Route path="/form-builder" element={<ProtectedRoute><FormBuilderWindow /></ProtectedRoute>} />
              <Route path="/form/:slug" element={<PublicForm />} />
              <Route path="/store/:slug" element={<Storefront />} />
              <Route path="/store/:slug/product/:productId" element={<ProductDetail />} />
              <Route path="/store/:slug/address-form" element={<CustomerAddressForm />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/store/:slug/checkout" element={<Checkout />} />
              <Route path="/invoice/:invoiceId/pay" element={<InvoicePayment />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/data-deletion" element={<DataDeletion />} />
              <Route path="/help" element={<HelpCenter />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CustomerAuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </CartProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
