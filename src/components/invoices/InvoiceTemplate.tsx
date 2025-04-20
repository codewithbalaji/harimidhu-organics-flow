import { useState, useEffect } from "react"
import { Plus, Download } from "lucide-react"
import { Invoice } from "@/types/index"
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
    taxRate: '5',
    gstin: '',
    paymentTerms: 'Immediate',
    signature: '',
    notes: 'Thank you for your business.'
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
  // Split tax equally for CGST and SGST
  const totalTaxRate = taxRate
  const cgstRate = totalTaxRate / 2
  const sgstRate = totalTaxRate / 2
  const cgstAmount = subtotal * cgstRate
  const sgstAmount = subtotal * sgstRate
  const total = subtotal + cgstAmount + sgstAmount
  const totalRounded = Math.round(total)

  // Convert to Indian number format
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Convert number to words
  const toWords = (num: number) => {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    
    const formatWords = (n: number) => {
      if (n < 20) return units[n];
      const digit = n % 10;
      return tens[Math.floor(n / 10)] + (digit ? '-' + units[digit] : '');
    };
    
    const convertToWords = (n: number) => {
      if (n === 0) return 'zero';
      
      let result = '';
      
      if (Math.floor(n / 10000000) > 0) {
        result += `${convertToWords(Math.floor(n / 10000000))} crore `;
        n %= 10000000;
      }
      
      if (Math.floor(n / 100000) > 0) {
        result += `${formatWords(Math.floor(n / 100000))} lakh `;
        n %= 100000;
      }
      
      if (Math.floor(n / 1000) > 0) {
        result += `${formatWords(Math.floor(n / 1000))} thousand `;
        n %= 1000;
      }
      
      if (Math.floor(n / 100) > 0) {
        result += `${formatWords(Math.floor(n / 100))} hundred `;
        n %= 100;
      }
      
      if (n > 0) {
        result += formatWords(n);
      }
      
      return result.trim();
    };
    
    // Round to 2 decimal places to handle floating point errors
    const roundedNum = Math.round(num * 100) / 100;
    const wholePart = Math.floor(roundedNum);
    const decimalPart = Math.round((roundedNum - wholePart) * 100);
    
    let result = convertToWords(wholePart);
    
    if (decimalPart > 0) {
      result += ` and ${convertToWords(decimalPart)} paise`;
    }
    
    return result.replace(/\b\w/g, char => char.toUpperCase()) + ' only';
  };

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

  // Format date to look like "03/15/2023"
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/') // ensure the format is correct
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

  const invoiceNumber = `INV${invoice.id.slice(0, 6)}/${new Date(invoice.createdAt).getFullYear().toString().slice(-2)}-${(new Date(invoice.createdAt).getFullYear() + 1).toString().slice(-2)}`
  const invoiceDate = formatDate(invoice.createdAt)
  const addressLines = formatLongText(invoice.deliveryAddress || '')

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="border-b pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex flex-col items-start gap-2 mb-2">
              {companyInfo.logo ? (
                <img 
                  src={companyInfo.logo} 
                  alt="Company Logo" 
                  className="w-32 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-3xl">
                  {companyInfo.name.charAt(0)}
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-800 uppercase mt-2">{companyInfo.name}</h2>
            </div>
            <p className="text-sm text-gray-600">{companyInfo.address}</p>
            <p className="text-sm text-gray-600">{companyInfo.city}</p>
            <p className="text-sm text-gray-600">{companyInfo.country}</p>
            {companyInfo.gstin && (
              <p className="text-sm text-gray-600 mt-1">GSTIN: {companyInfo.gstin}</p>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-800">TAX INVOICE</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="mb-4">
            <p className="text-sm mb-1"><span className="font-medium">Invoice No:</span> {invoiceNumber}</p>
            <p className="text-sm mb-1"><span className="font-medium">Invoice Date:</span> {invoiceDate}</p>
            <p className="text-sm mb-1"><span className="font-medium">Payment Terms:</span> {companyInfo.paymentTerms || 'Immediate'}</p>
          </div>
          
          <div className="border rounded p-3">
            <h3 className="font-medium text-gray-700 mb-1">Bill To</h3>
            <p className="text-sm text-gray-600">{invoice.customerName}</p>
            {addressLines.map((line, index) => (
              <p key={index} className="text-sm text-gray-600">{line}</p>
            ))}
            <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
          </div>
        </div>
        
        <div>
          <div className="mt-24 border rounded p-3">
            <h3 className="font-medium text-gray-700 mb-1">Ship To</h3>
            <p className="text-sm text-gray-600">{invoice.customerName}</p>
            {addressLines.map((line, index) => (
              <p key={index} className="text-sm text-gray-600">{line}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 text-left text-sm border">S.No</th>
              <th className="py-2 px-3 text-left text-sm border">Description</th>
              <th className="py-2 px-3 text-center text-sm border">Qty</th>
              <th className="py-2 px-3 text-right text-sm border">Unit Price</th>
              <th className="py-2 px-3 text-right text-sm border">Net Price</th>
              <th className="py-2 px-3 text-center text-sm border" colSpan={2}>CGST</th>
              <th className="py-2 px-3 text-center text-sm border" colSpan={2}>SGST</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="py-1 px-3 text-left text-xs border"></th>
              <th className="py-1 px-3 text-left text-xs border"></th>
              <th className="py-1 px-3 text-center text-xs border"></th>
              <th className="py-1 px-3 text-right text-xs border"></th>
              <th className="py-1 px-3 text-right text-xs border"></th>
              <th className="py-1 px-3 text-center text-xs border">Rate %</th>
              <th className="py-1 px-3 text-right text-xs border">Amount</th>
              <th className="py-1 px-3 text-center text-xs border">Rate %</th>
              <th className="py-1 px-3 text-right text-xs border">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-t">
                <td className="py-2 px-3 text-sm border">{index + 1}</td>
                <td className="py-2 px-3 text-sm border">
                  {item.description || "Enter item name/description"}
                </td>
                <td className="py-2 px-3 text-center text-sm border">{item.qty}</td>
                <td className="py-2 px-3 text-right text-sm border">{formatCurrency(item.rate)}</td>
                <td className="py-2 px-3 text-right text-sm border">{formatCurrency(item.amount)}</td>
                <td className="py-2 px-3 text-center text-sm border">{(cgstRate * 100).toFixed(1)}</td>
                <td className="py-2 px-3 text-right text-sm border">{formatCurrency(item.amount * cgstRate)}</td>
                <td className="py-2 px-3 text-center text-sm border">{(sgstRate * 100).toFixed(1)}</td>
                <td className="py-2 px-3 text-right text-sm border">{formatCurrency(item.amount * sgstRate)}</td>
              </tr>
            ))}

            {!readOnly && (
              <tr>
                <td colSpan={9} className="py-2 px-3 border">
                  <button onClick={addItem} className="flex items-center text-green-600 text-sm gap-1">
                    <Plus size={16} className="text-green-600" />
                    <span>Add Line Item</span>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Amount in words:</h3>
            <p className="text-sm text-gray-600">{toWords(totalRounded)}</p>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Notes:</h3>
            <p className="text-sm text-gray-600">
              {invoice.notes && invoice.notes.trim() !== "" 
                ? invoice.notes 
                : (companyInfo.notes || "Thank you for your business.")}
            </p>
          </div>
        </div>
        
        <div>
          <div className="border-t pt-2">
            <div className="flex justify-between py-1">
              <span className="text-sm">Subtotal</span>
              <span className="text-sm">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm">CGST</span>
              <span className="text-sm">{formatCurrency(cgstAmount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm">SGST</span>
              <span className="text-sm">{formatCurrency(sgstAmount)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-medium">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-gray-200 mt-2">
              <span className="text-sm font-bold">Grand Total (Rounded off)</span>
              <span className="text-sm font-bold">₹ {totalRounded}</span>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t">
            <div className="flex justify-between">
              <div>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-medium">Payment Status:</span> <span className={invoice.paidStatus === 'paid' ? 'text-green-700' : 'text-red-700'}>{invoice.paidStatus.toUpperCase()}</span></p>
                  {invoice.paymentMethod && invoice.paymentMethod.trim() !== "" && (
                    <p className="text-sm"><span className="font-medium">Payment Method:</span> {invoice.paymentMethod}</p>
                  )}
                  {invoice.paymentReference && invoice.paymentReference.trim() !== "" && (
                    <p className="text-sm"><span className="font-medium">Payment Reference:</span> {invoice.paymentReference}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {companyInfo.signature ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={companyInfo.signature} 
                      alt="Authorized Signature" 
                      className="h-16 object-contain mb-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <p className="text-sm font-medium">Authorized Signature</p>
                  </div>
                ) : (
                  <p className="text-sm font-medium mb-8">Authorized Signature</p>
                )}
              </div>
            </div>
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