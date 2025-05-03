import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Invoice } from "@/types";
import { invoicesCollection } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import InvoiceTemplate from "./InvoiceTemplate";
import { Alert, AlertDescription } from "@/components/ui/alert";

const InvoiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const hasOutstandingAmount = invoice.outstandingAmount && invoice.outstandingAmount > 0;

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
          <Button 
            size="sm" 
            className="gap-2 bg-organic-primary hover:bg-organic-dark"
            onClick={() => navigate(`/invoices/status/${invoice.id}`)}
          >
            <FileText className="h-4 w-4" />
            Update Status
          </Button>
        </div>

        {hasOutstandingAmount && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              This invoice includes an outstanding amount of ₹{invoice.outstandingAmount.toFixed(2)}
              {invoice.outstandingNote && `: ${invoice.outstandingNote}`}
            </AlertDescription>
          </Alert>
        )}

        <InvoiceTemplate invoice={invoice} />
      </div>
    </DashboardLayout>
  );
};

export default InvoiceDetails; 