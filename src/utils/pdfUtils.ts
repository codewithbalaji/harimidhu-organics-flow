import { Invoice } from '@/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface CompanyInfo {
  name: string
  owner?: string
  logo?: string
  address: string
  city: string
  country: string
  email: string
  phone: string
  taxRate: string
}

// Helper function to get company info from Firebase
export const getCompanyInfo = async (): Promise<Partial<CompanyInfo>> => {
  try {
    // Try to load from Firebase first
    const docRef = doc(db, 'companySettings', 'default')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data() as CompanyInfo
    } else {
      // Fall back to localStorage if needed
      const savedInfo = localStorage.getItem('companyInfo')
      if (savedInfo) {
        return JSON.parse(savedInfo) as CompanyInfo
      }
    }
  } catch (error) {
    console.error('Error fetching company info:', error)
  }
  
  // Return empty object if failed
  return {}
}

export const generateInvoicePdf = async (invoice: Invoice, companyInfo?: Partial<CompanyInfo>) => {
  // If no company info provided, fetch it
  if (!companyInfo || Object.keys(companyInfo).length === 0) {
    companyInfo = await getCompanyInfo()
  }
  
  const defaultCompanyInfo: CompanyInfo = {
    name: 'Harimidhu Organic',
    owner: 'Karthick G',
    logo: '',
    address: 'No.71, comet street, VGN Windsor park,',
    city: 'Phase 4, Avadi, Chennai, Tamil Nadu 600077',
    country: 'India',
    email: 'info@harimidhu.com',
    phone: '+91 9876543210',
    taxRate: '5'
  }

  const info = { ...defaultCompanyInfo, ...companyInfo }
  
  // Create new document
  const doc = new jsPDF()
  
  // Set document properties
  doc.setProperties({
    title: `Invoice-${invoice.id.slice(0, 6)}`,
    subject: `Invoice for ${invoice.customerName}`,
    author: info.name,
    creator: info.name
  })
  
  // Define colors
  const primaryColor = [0, 128, 0] // Green
  const secondaryColor = [100, 100, 100] // Dark gray
  const lightGrayColor = [240, 240, 240] // Light gray for backgrounds
  
  // Helper for text formatting
  const formatLongText = (text: string, maxChars = 40) => {
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

  // Format date to look like "Apr 20, 2025"
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }
  
  // Format currency properly
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    })
  }
  
  // Document starts at y = 10mm
  let y = 10
  
  // Section 1: Header with Company Info and Invoice Title
  
  // Company Logo or placeholder
  if (info.logo) {
    try {
      // Adjust logo position and size
      doc.addImage(info.logo, 'JPEG', 15, y, 20, 20)
    } catch (error) {
      console.error('Error adding logo image:', error)
      // Fallback to text if image fails
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.ellipse(25, y + 10, 10, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.text(info.name.charAt(0).toUpperCase(), 23, y + 14)
    }
  } else {
    // Draw a circle with the company initial
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.ellipse(25, y + 10, 10, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text(info.name.charAt(0).toUpperCase(), 23, y + 14)
  }
  
  // Company Name below the logo
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(info.name, 15, y + 25)
  
  // Company Address Block
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(info.owner || '', 15, y + 30)
  doc.text(info.address, 15, y + 35)
  doc.text(info.city, 15, y + 40)
  doc.text(info.country, 15, y + 45)
  
  // Invoice Title
  doc.setFontSize(22)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text('INVOICE', 195, y + 15, { align: 'right' })
  
  y += 55 // Move down for next section
  
  // Section 2: Bill To and Invoice Info
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Bill To:', 15, y)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(invoice.customerName, 15, y + 5)
  
  // Handle multi-line addresses
  const addressLines = formatLongText(invoice.deliveryAddress || '', 40)
  addressLines.forEach((line, index) => {
    doc.text(line, 15, y + 10 + (index * 5))
  })
  
  doc.text(invoice.customerPhone || '', 15, y + 10 + (addressLines.length * 5))
  
  // Invoice Details
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  
  // Create a table-like structure for invoice details
  const detailsX = 130
  const alignRightX = 195
  
  doc.text('Invoice#', detailsX, y)
  doc.setTextColor(0, 0, 200) // Blue for invoice number
  doc.text(`INV-${invoice.id.slice(0, 6)}`, alignRightX, y, { align: 'right' })
  
  doc.setTextColor(80, 80, 80)
  doc.text('Invoice Date', detailsX, y + 10)
  doc.setTextColor(0, 0, 0)
  doc.text(formatDate(invoice.createdAt), alignRightX, y + 10, { align: 'right' })
  
  doc.setTextColor(80, 80, 80)
  doc.text('Due Date', detailsX, y + 20)
  doc.setTextColor(0, 0, 200) // Blue for due date
  doc.text(formatDate(invoice.dueDate), alignRightX, y + 20, { align: 'right' })
  
  y += 35 // Move down for items table
  
  // Section 3: Items Table
  const items = invoice.items.map(item => {
    return [
      item.name || item.productName || '',
      item.quantity.toString(),
      formatCurrency(item.price || item.unitPrice || 0),
      formatCurrency((item.price || item.unitPrice || 0) * item.quantity)
    ]
  })
  
  // Ensure we have at least 3 rows to match the template
  while (items.length < 3) {
    items.push(['', '', '', ''])
  }
  
  // Calculate totals
  const subtotal = invoice.items.reduce((sum, item) => 
    sum + ((item.price || item.unitPrice || 0) * item.quantity), 0)
  const taxRate = parseFloat(info.taxRate || '0') / 100
  const tax = subtotal * taxRate
  const total = subtotal + tax
  
  // Define the table
  autoTable(doc, {
    startY: y,
    head: [['Item Description', 'Qty', 'Rate', 'Amount']],
    body: items,
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' }, 
      3: { cellWidth: 35, halign: 'right' }
    },
    styles: {
      cellPadding: 5,
      fontSize: 10
    },
    didDrawPage: (data) => {
      y = data.cursor.y // Update the y position
    }
  })
  
  y += 10 // Space after table
  
  // Section 4: Totals
  const totalsWidth = 80
  const totalsX = 130
  const totalsRightX = 195
  
  // Subtotal row
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Sub Total', totalsX, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatCurrency(subtotal), totalsRightX, y, { align: 'right' })
  
  y += 7 // Move down for next row
  
  // Tax row
  doc.setTextColor(100, 100, 100)
  doc.text(`Tax (${info.taxRate}%)`, totalsX, y)
  doc.setTextColor(0, 0, 0)
  doc.text(formatCurrency(tax), totalsRightX, y, { align: 'right' })
  
  y += 7 // Move down for total row
  
  // Total row with background
  doc.setFillColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2])
  doc.rect(totalsX, y - 5, totalsRightX - totalsX, 10, 'F')
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL', totalsX + 10, y)
  doc.text(formatCurrency(total), totalsRightX, y, { align: 'right' })
  
  y += 15 // Space before final sections
  
  // Section 5: Notes
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Notes', 15, y)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(invoice.notes || 'It was great doing business with you.', 15, y + 7)
  
  // Section 6: Payment info
  const paymentInfoX = 130
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Payment Status:', paymentInfoX, y)
  
  // Payment status - color coded
  if (invoice.paidStatus === 'paid') {
    doc.setTextColor(0, 128, 0) // Green for paid
  } else {
    doc.setTextColor(200, 0, 0) // Red for unpaid
  }
  doc.text(invoice.paidStatus.toUpperCase(), paymentInfoX + 30, y)
  
  // Payment method if available
  if (invoice.paymentMethod) {
    y += 7
    doc.setTextColor(0, 0, 0)
    doc.text('Payment Method:', paymentInfoX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.paymentMethod, paymentInfoX + 30, y)
  }
  
  // Footer with company contact info
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Email: ${info.email} | Phone: ${info.phone}`, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' })
  
  return doc
} 