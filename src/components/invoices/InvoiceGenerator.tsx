import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Order, Invoice } from "@/types";
import { ordersCollection, invoicesCollection } from "@/firebase";
import { doc, getDoc, addDoc } from "firebase/firestore";
import { generateInvoicePdf } from "@/utils/pdfUtils";

const InvoiceGenerator = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 14 days from now
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setIsLoading(false);
      toast.error("Order ID not provided");
      navigate("/orders");
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      const orderDoc = await getDoc(doc(ordersCollection, orderId));
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        setOrder({
          id: orderDoc.id,
          ...data,
          createdAt: data.createdAt || Date.now()
        } as Order);
      } else {
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

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) {
      toast.error("Order information is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create invoice data
      const invoiceData = {
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        items: order.items,
        total: order.total,
        shippingCost: order.shippingCost,
        paidStatus: paymentStatus,
        paymentMethod: paymentMethod || "",
        paymentDate: paymentStatus === 'paid' && paymentDate ? new Date(paymentDate).getTime() : null,
        paymentReference: paymentReference || "",
        dueDate: new Date(dueDate).getTime(),
        notes: notes || "",
        createdAt: Date.now()
      };
      
      // Add invoice to Firestore
      const docRef = await addDoc(invoicesCollection, invoiceData);
      
      // Make a complete invoice object with the ID
      const newInvoice = {
        id: docRef.id,
        ...invoiceData
      };
      
      // Store for download function
      setInvoice(newInvoice);
      
      toast.success("Invoice generated successfully!");
      navigate(`/invoices/${docRef.id}`);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!invoice) return;
    
    try {
      // Get company info from localStorage or use defaults
      const savedInfo = localStorage.getItem('companyInfo');
      const companyInfo = savedInfo ? JSON.parse(savedInfo) : {};
      
      // Ensure the custom notes from the invoice are used
      if (invoice.notes) {
        companyInfo.notes = invoice.notes;
      }
      
      // Generate PDF
      const doc = generateInvoicePdf(invoice, companyInfo);
      
      // Save the PDF
      doc.save(`Invoice-${invoice.id.slice(0, 6)}.pdf`);
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Generate Invoice">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Generate Invoice">
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

  const formattedDate = new Date(order.createdAt).toLocaleDateString();

  // Calculate subtotal from items, excluding shipping cost
  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <DashboardLayout title="Generate Invoice">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center">
          <Link to="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">Generate Invoice for Order #{order.id}</h2>
        </div>

        <form onSubmit={submitForm}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-medium">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">{formattedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{order.customerName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{order.customerPhone || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Delivery Address</p>
                    <p className="font-medium">{order.deliveryAddress || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                              Quantity: {item.quantity} x 
                              {item.customPrice ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="line-through text-xs">₹{item.originalPrice?.toFixed(2)}</span>
                                  <span className="text-organic-primary font-medium">₹{item.price.toFixed(2)}</span>
                                  <span className="ml-1 text-xs px-1 py-0.25 bg-blue-100 text-blue-800 rounded-sm">
                                    Custom
                                  </span>
                                </span>
                              ) : (
                                <span> ₹{item.price.toFixed(2)}</span>
                              )}
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

                  <div className="pt-4 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal:</span>
                      <span>₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {order.shippingCost > 0 && (
                      <div className="flex justify-between mt-2">
                        <span>Shipping Cost:</span>
                        <span>₹{order.shippingCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium mt-2 pt-2 border-t">
                      <span>Total Amount:</span>
                      <span>₹{order.total?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Payment Status</Label>
                      <Select
                        value={paymentStatus}
                        onValueChange={(value: "paid" | "unpaid") => setPaymentStatus(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method">Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="credit-card">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentReference">Payment Reference</Label>
                    <Input
                      id="paymentReference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Reference number or transaction ID"
                      disabled={paymentStatus !== "paid"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes for the invoice"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg"
                className="gap-2 bg-organic-primary hover:bg-organic-dark"
                disabled={isSubmitting}
              >
                <FileText className="h-4 w-4" />
                {isSubmitting ? "Generating..." : "Generate Invoice"}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleDownloadPdf}
                disabled={!invoice || isSubmitting}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceGenerator; 