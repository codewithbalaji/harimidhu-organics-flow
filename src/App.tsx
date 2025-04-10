import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import EditCustomer from "./pages/EditCustomer";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import UpdateOrderStatus from "./pages/UpdateOrderStatus";
import AddCustomer from "./pages/AddCustomer";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProduct";
import AddOrder from "./pages/AddOrder";
import Invoices from "./pages/Invoices";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import ViewInvoice from "./pages/ViewInvoice";
import UpdateInvoiceStatus from "./pages/UpdateInvoiceStatus";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/new" element={<AddCustomer />} />
              <Route path="/customers/:id" element={<CustomerDetails />} />
              <Route path="/customers/edit/:id" element={<EditCustomer />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/new" element={<AddProduct />} />
              <Route path="/products/edit/:id" element={<EditProduct />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/new" element={<AddOrder />} />
              <Route path="/orders/:id" element={<OrderDetails />} />
              <Route path="/orders/status/:id" element={<UpdateOrderStatus />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/generate/:orderId" element={<InvoiceGenerator />} />
              <Route path="/invoices/status/:id" element={<UpdateInvoiceStatus />} />
              <Route path="/invoices/:id" element={<ViewInvoice />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
