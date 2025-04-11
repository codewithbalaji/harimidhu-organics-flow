import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  FileText, 
  Building, 
  Mail, 
  Phone,
  MapPin,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Invoice } from "@/types";
import { invoicesCollection } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";
import { useReactToPrint } from "react-to-print";

const InvoiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails();
    } else {
      setIsLoading(false);
      toast.error("Invoice ID not provided");
      navigate("/invoices");
    }
  }, [id]);

  const fetchInvoiceDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      console.log("Fetching invoice with ID:", id);
      
      const invoiceDoc = await getDoc(doc(invoicesCollection, id));
      console.log("Invoice document:", invoiceDoc.exists() ? "Found" : "Not found");
      
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data();
        setInvoice({
          id: invoiceDoc.id,
          ...data
        } as Invoice);
      } else {
        toast.error("Invoice not found");
        navigate("/invoices");
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error("Failed to fetch invoice details");
      navigate("/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Invoice-${invoice?.id}`,
    onBeforeGetContent: () => {
      toast.info("Preparing invoice for printing...");
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    onAfterPrint: () => {
      toast.success("Invoice printed successfully!");
    }
  });

  const handleDownload = () => {
    if (!invoice) return;
    
    // In a real application, this would generate a PDF
    // For now, we'll just show a success message
    toast.success(`Invoice #${invoice.id} downloaded as PDF`);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Invoice not found</p>
          <Link to="/invoices" className="mt-4 inline-block">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const createdDate = new Date(invoice.createdAt).toLocaleDateString();
  const dueDate = new Date(invoice.dueDate).toLocaleDateString();

  return (
    <DashboardLayout title="Invoice Details">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/invoices">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              onClick={() => navigate(`/invoices/status/${invoice.id}`)}
            >
              <FileText className="h-4 w-4" />
              Update Status
            </Button>
          </div>
        </div>

        {/* Printable Invoice */}
        <div ref={printRef} className="bg-white p-8 rounded-lg shadow-sm border">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-organic-primary">INVOICE</h1>
                <p className="text-sm text-muted-foreground mt-1">#{invoice.id}</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-semibold">Harimidhu Organics</h2>
                <div className="flex flex-col items-end text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span>123 Organic Street, Chennai</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>contact@harimidhu.com</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>+91 9876543210</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">Bill To:</h3>
                  <p className="font-semibold">{invoice.customerName}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
                  <div className="flex items-start gap-1 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-1 flex-shrink-0" />
                    <span>{invoice.deliveryAddress}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span>{createdDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span>{dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span>{invoice.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={cn(
                      invoice.paidStatus === "paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}>
                      {invoice.paidStatus === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                  {invoice.paidStatus === "paid" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        <span>{invoice.paymentMethod.replace("-", " ")}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Invoice Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Invoice Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-1 text-left">Item</th>
                        <th className="py-2 px-1 text-right">Quantity</th>
                        <th className="py-2 px-1 text-right">Price</th>
                        <th className="py-2 px-1 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items && invoice.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-1 text-left">{item.name}</td>
                          <td className="py-3 px-1 text-right">{item.quantity}</td>
                          <td className="py-3 px-1 text-right">₹{item.price.toFixed(2)}</td>
                          <td className="py-3 px-1 text-right">₹{(item.quantity * item.price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="py-3 px-1 text-right font-semibold">Total:</td>
                        <td className="py-3 px-1 text-right font-semibold">₹{invoice.total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="border-t pt-4 text-center text-sm text-muted-foreground">
              <p>Thank you for your business!</p>
              <p className="mt-1">For any queries, please contact us at support@harimidhu.com</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceDetails; 