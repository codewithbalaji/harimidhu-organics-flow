
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { orders } from "@/data/mockData";
import { Order } from "@/types";

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch order details
    setLoading(true);
    const foundOrder = orders.find(o => o.id === id);
    
    setTimeout(() => {
      if (foundOrder) {
        setOrder(foundOrder);
      }
      setLoading(false);
    }, 500);
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout title="Order Details">
        <div className="flex justify-center items-center h-40">
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Order Not Found">
        <Alert>
          <AlertTitle>Order not found</AlertTitle>
          <AlertDescription>
            The order you are looking for does not exist or has been removed.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link to="/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const handlePrint = () => {
    toast.info("Preparing order for printing...");
    setTimeout(() => {
      toast.success("Order ready for printing!");
      window.print();
    }, 1000);
  };

  const handleGenerateInvoice = () => {
    toast.success("Invoice generated successfully!");
    navigate(`/invoices?orderId=${order.id}`);
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString();

  return (
    <DashboardLayout title={`Order #${order.id}`}>
      <div className="flex flex-col gap-6">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Link to="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print Order
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              onClick={handleGenerateInvoice}
            >
              <FileText className="h-4 w-4" />
              Generate Invoice
            </Button>
          </div>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-medium">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs capitalize",
                    order.status === "pending" && "bg-yellow-100 text-yellow-800",
                    order.status === "processing" && "bg-blue-100 text-blue-800",
                    order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                    order.status === "delivered" && "bg-green-100 text-green-800",
                  )}>
                    {order.status.replace(/-/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-bold">₹{order.total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer ID:</span>
                  <span>{order.customerId}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">₹{item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Order Total:</TableCell>
                  <TableCell className="text-right font-bold">₹{order.total}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OrderDetails;
