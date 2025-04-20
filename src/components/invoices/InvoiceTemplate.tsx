import { useState, useEffect } from "react"
import { Plus, Download } from "lucide-react"
import { Invoice } from "@/types"
import { Button } from "@/components/ui/button"
import { generateInvoicePdf } from "@/utils/pdfUtils"
import { toast } from "sonner"
import { db } from "@/firebase"
import { doc, getDoc } from "firebase/firestore"

interface InvoiceTemplateProps {
  invoice: Invoice
  readOnly?: boolean
}

export default function InvoiceTemplate({ invoice, readOnly = true }: InvoiceTemplateProps) {
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Harimidhu Organic',
    owner: 'Karthick G',
    logo: '',
    address: 'No.71, comet street, VGN Windsor park,',
    city: 'Phase 4, Avadi, Chennai, Tamil Nadu 600077',
    country: 'India',
    email: 'info@harimidhu.com',
    phone: '+91 9876543210',
    taxRate: '5'
  });
  
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        // Try to load from Firebase first
        const docRef = doc(db, 'companySettings', 'default')
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          setCompanyInfo(prev => ({...prev, ...docSnap.data()}))
        } else {
          // Fall back to localStorage if needed
          const savedInfo = localStorage.getItem('companyInfo')
          if (savedInfo) {
            try {
              setCompanyInfo(prev => ({...prev, ...JSON.parse(savedInfo)}))
            } catch (error) {
              console.error('Error parsing company info:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching company info:', error)
      }
    }
    
    fetchCompanyInfo()
  }, [])

  const [items, setItems] = useState(
    invoice.items.length > 0
      ? invoice.items.map((item, index) => ({
          id: index + 1,
          description: item.name || item.productName || "",
          qty: item.quantity,
          rate: item.price || item.unitPrice || 0,
          amount: (item.price || item.unitPrice || 0) * item.quantity,
        }))
      : [
          { id: 1, description: "Product Item", qty: 1, rate: 0, amount: 0 },
          { id: 2, description: "", qty: 1, rate: 0, amount: 0 },
          { id: 3, description: "", qty: 1, rate: 0, amount: 0 },
        ]
  )

  const addItem = () => {
    if (readOnly) return
    setItems([...items, { id: items.length + 1, description: "", qty: 1, rate: 0, amount: 0 }])
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const taxRate = parseFloat(companyInfo.taxRate || '0') / 100
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleDownloadPdf = async () => {
    try {
      // Use the loaded company info for the PDF
      const doc = await generateInvoicePdf(invoice, companyInfo)
      
      // Save the PDF
      doc.save(`Invoice-${invoice.id.slice(0, 6)}.pdf`)
      toast.success('Invoice downloaded successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  // Format date to look like "Apr 20, 2025"
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Split long text to max 30 words per line
  const formatLongText = (text: string, maxChars = 30) => {
    if (!text || text.length <= maxChars) return [text];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  const invoiceDate = formatDate(invoice.createdAt)
  const dueDate = formatDate(invoice.dueDate)
  const addressLines = formatLongText(invoice.deliveryAddress || '')

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-2">
            {companyInfo.logo ? (
              <img 
                src={companyInfo.logo} 
                alt="Company Logo" 
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  
                }}
              />
            ) : (
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {companyInfo.name.charAt(0)}
              </div>
            )}
          </div>
          <h2 className="text-xl font-medium text-gray-700 mt-2">{companyInfo.name}</h2>
          <p className="text-gray-600 mt-1">{companyInfo.owner}</p>
          <p className="text-gray-600">{companyInfo.address}</p>
          <p className="text-gray-600">{companyInfo.city}</p>
          <p className="text-gray-600">{companyInfo.country}</p>
        </div>
        <div>
          <h1 className="text-4xl font-medium text-gray-600">INVOICE</h1>
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Bill To:</h3>
          <p className="text-gray-500">{invoice.customerName}</p>
          {addressLines.map((line, index) => (
            <p key={index} className="text-gray-500">{line}</p>
          ))}
          <p className="text-gray-500">{invoice.customerPhone}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          <div className="text-gray-600">Invoice#</div>
          <div className="text-blue-600">INV-{invoice.id.slice(0, 6)}</div>
          <div className="text-gray-600">Invoice Date</div>
          <div className="text-gray-700">{invoiceDate}</div>
          <div className="text-gray-600">Due Date</div>
          <div className="text-blue-600">{dueDate}</div>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-gray-600 text-white grid grid-cols-12 p-3 rounded-t-md">
          <div className="col-span-6">Item Description</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-center">Rate</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        {items.map((item, index) => (
          <div key={item.id} className="border-b border-gray-200 grid grid-cols-12 py-3">
            <div className="col-span-6 text-gray-700">
              {item.description || "Enter item name/description"}
            </div>
            <div className="col-span-2 text-center">{item.qty}</div>
            <div className="col-span-2 text-center">₹{item.rate.toFixed(2)}</div>
            <div className="col-span-2 text-right">₹{item.amount.toFixed(2)}</div>
          </div>
        ))}

        {!readOnly && (
          <button onClick={addItem} className="flex items-center text-green-600 mt-4 gap-1">
            <Plus size={16} className="text-green-600" />
            <span>Add Line Item</span>
          </button>
        )}

        <div className="grid grid-cols-12 mt-6">
          <div className="col-span-8"></div>
          <div className="col-span-2 text-right text-gray-600">Sub Total</div>
          <div className="col-span-2 text-right">₹{subtotal.toFixed(2)}</div>
        </div>

        <div className="grid grid-cols-12 mt-2">
          <div className="col-span-8"></div>
          <div className="col-span-2 text-right text-gray-600">Tax ({companyInfo.taxRate}%)</div>
          <div className="col-span-2 text-right">₹{tax.toFixed(2)}</div>
        </div>

        <div className="grid grid-cols-12 mt-2 bg-gray-200 p-3 rounded-b-md">
          <div className="col-span-8"></div>
          <div className="col-span-2 text-right font-medium text-gray-700">TOTAL</div>
          <div className="col-span-2 text-right font-medium">₹ {total.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Notes</h3>
          <p className="text-gray-600">{invoice.notes || "It was great doing business with you."}</p>
        </div>
        <div>
          <div className="space-y-2">
            <p><span className="font-medium text-gray-700">Payment Status:</span> <span className={invoice.paidStatus === 'paid' ? 'text-green-700' : 'text-red-700'}>{invoice.paidStatus.toUpperCase()}</span></p>
            {invoice.paymentMethod && (
              <p><span className="font-medium text-gray-700">Payment Method:</span> {invoice.paymentMethod}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button 
          variant="outline" 
          className="gap-2 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
          onClick={handleDownloadPdf}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  )
} 