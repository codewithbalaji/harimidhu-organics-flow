import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, FileText, Eye, TruckIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Order } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ordersCollection, invoicesCollection } from "@/firebase";
import { getDocs, query, where, orderBy, addDoc } from "firebase/firestore";

const Orders = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const statuses = ["all", "pending", "processing", "out-for-delivery", "delivered"];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const ordersQuery = query(ordersCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterOrders(query, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    filterOrders(searchQuery, value);
  };

  const filterOrders = (query: string, status: string) => {
    let filtered = [...orders];
    
    if (query.trim() !== "") {
      filtered = filtered.filter(
        order =>
          order.id.toLowerCase().includes(query) ||
          (order.customerName && order.customerName.toLowerCase().includes(query))
      );
    }
    
    if (status !== "all") {
      filtered = filtered.filter(order => order.status === status);
    }
    
    setFilteredOrders(filtered);
  };

  const handleViewDetails = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleUpdateStatus = (orderId: string) => {
    navigate(`/orders/status/${orderId}`);
  };

  const handleGenerateInvoice = async (order: Order) => {
    try {
      // Check if invoice already exists for this order
      const invoicesQuery = query(invoicesCollection, where("orderId", "==", order.id));
      const querySnapshot = await getDocs(invoicesQuery);
      
      if (!querySnapshot.empty) {
        // Invoice already exists, navigate to it
        const invoiceId = querySnapshot.docs[0].id;
        toast.info("Invoice already exists");
        navigate(`/invoices/${invoiceId}`);
        return;
      }
      
      // Navigate to invoice generation page with order ID
      navigate(`/invoices/generate/${order.id}`);
    } catch (error) {
      console.error("Error checking for existing invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Orders">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orders">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                className="pl-9"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            <Select
              value={statusFilter}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All Statuses" : status.replace(/-/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Link to="/orders/new">
            <Button className="w-full sm:w-auto gap-1 bg-organic-primary hover:bg-organic-dark">
              <Plus className="h-4 w-4" />
              Create New Order
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customerName || "Customer"}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>₹{order.total?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full capitalize",
                          order.status === "pending" && "bg-yellow-100 text-yellow-800",
                          order.status === "processing" && "bg-blue-100 text-blue-800",
                          order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                          order.status === "delivered" && "bg-green-100 text-green-800",
                        )}>
                          {order.status?.replace(/-/g, " ") || "pending"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => handleViewDetails(order.id)}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => handleUpdateStatus(order.id)}
                            >
                              <TruckIcon className="h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => handleGenerateInvoice(order)}
                            >
                              <FileText className="h-4 w-4" />
                              Generate Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No orders found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Orders;
