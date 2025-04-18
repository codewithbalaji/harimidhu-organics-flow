import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, FileText, TruckIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Order } from "@/types";
import { ordersCollection } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    } else {
      setIsLoading(false);
      toast.error("Order ID not found");
      navigate("/orders");
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      console.log("Fetching order with ID:", id); // Debug log
      
      const orderDoc = await getDoc(doc(ordersCollection, id));
      console.log("Order document:", orderDoc.exists() ? orderDoc.data() : "Not found"); // Debug log
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        const orderData = {
          id: orderDoc.id,
          ...data,
          createdAt: data.createdAt || Date.now(),
          status: data.status || "pending",
          items: data.items || [],
          total: data.total || 0,
          customerName: data.customerName || "Customer",
          customerPhone: data.customerPhone || "Not specified",
          deliveryAddress: data.deliveryAddress || "Not specified"
        } as Order;
        
        console.log("Processed order data:", orderData); // Debug log
        setOrder(orderData);
      } else {
        console.error("Order not found with ID:", id); // Debug log
        toast.error("Order not found");
        navigate("/orders");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to fetch order details");
      navigate("/orders");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Order Details">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Order Details">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Order not found</p>
          <Link to="/orders" className="mt-4 inline-block">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
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
    <DashboardLayout title="Order Details">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link to="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  className={cn(
                    "capitalize",
                    order.status === "pending" && "bg-yellow-100 text-yellow-800",
                    order.status === "processing" && "bg-blue-100 text-blue-800",
                    order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                    order.status === "delivered" && "bg-green-100 text-green-800",
                  )}
                >
                  {order.status?.replace(/-/g, " ") || "pending"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span>{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-medium">₹{order.total?.toFixed(2) || "0.00"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right">{order.deliveryAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{order.customerPhone}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} x ₹{item.price}
                        </p>
                      </div>
                      <p className="font-medium">₹{(item.quantity * item.price).toFixed(2)}</p>
                    </div>
                    {index < order.items.length - 1 && <Separator className="my-4" />}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No items in this order</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link to={`/orders/status/${order.id}`}>
            <Button className="gap-2">
              <TruckIcon className="h-4 w-4" />
              Update Status
            </Button>
          </Link>
        </div>

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
      </div>
    </DashboardLayout>
  );
};

export default OrderDetails;
