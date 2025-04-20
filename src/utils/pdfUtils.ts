import { Invoice } from "@/types/index";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

// Import NotoSans which supports the rupee symbol
// Note: In a real implementation, you would need to include the actual font file
// To convert a font to base64, use: https://peckconsulting.s3.amazonaws.com/fontconverter/fontconverter.html
const notoSansNormalBase64 = "base64FontDataWouldGoHere"; // You'd need to replace this with actual base64 font data

// Setup the font when module is loaded
function setupFont(doc: jsPDF) {
  try {
    // Try to add the font to virtual file system
    doc.addFileToVFS("NotoSans-Regular.ttf", notoSansNormalBase64);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    return true;
  } catch (error) {
    console.error("Error loading font:", error);
    return false;
  }
}

interface CompanyInfo {
  name: string;
  owner?: string;
  logo?: string;
  address: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  taxRate: string;
  gstin?: string;
  paymentTerms?: string;
  signature?: string;
  notes?: string;
}

// Convert number to words
const toWords = (num: number) => {
  const units = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  const formatWords = (n: number) => {
    if (n < 20) return units[n];
    const digit = n % 10;
    return tens[Math.floor(n / 10)] + (digit ? "-" + units[digit] : "");
  };

  const convertToWords = (n: number) => {
    if (n === 0) return "zero";

    let result = "";

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

  return result.replace(/\b\w/g, (char) => char.toUpperCase()) + " only";
};

// Helper function to get company info from Firebase
export const getCompanyInfo = async (): Promise<Partial<CompanyInfo>> => {
  try {
    // Try to load from Firebase first
    const docRef = doc(db, "companySettings", "default");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as CompanyInfo;
    } else {
      // Fall back to localStorage if needed
      const savedInfo = localStorage.getItem("companyInfo");
      if (savedInfo) {
        return JSON.parse(savedInfo) as CompanyInfo;
      }
    }
  } catch (error) {
    console.error("Error fetching company info:", error);
  }

  // Return empty object if failed
  return {};
};

// Helper to load and add images asynchronously
const addImageToDoc = async (
  doc: jsPDF,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<boolean> => {
  if (!src) return false;

  try {
    // For same-origin images that don't require fetch
    if (src.startsWith("data:")) {
      doc.addImage(src, "AUTO", x, y, width, height);
      return true;
    }

    // For external images
    const response = await fetch(src, { mode: "cors" });
    if (!response.ok) throw new Error("Failed to fetch image");

    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    doc.addImage(base64, "AUTO", x, y, width, height);
    return true;
  } catch (error) {
    console.error("Error loading image:", error);
    return false;
  }
};

export const generateInvoicePdf = async (
  invoice: Invoice,
  companyInfo?: Partial<CompanyInfo>
) => {
  // If no company info provided, fetch it
  if (!companyInfo || Object.keys(companyInfo).length === 0) {
    companyInfo = await getCompanyInfo();
  }

  const defaultCompanyInfo: CompanyInfo = {
    name: "Harimidhu Organic",
    owner: "Karthick G",
    logo: "",
    address: "No.71, comet street, VGN Windsor park,",
    city: "Phase 4, Avadi, Chennai, Tamil Nadu 600077",
    country: "India",
    email: "info@harimidhu.com",
    phone: "+91 9876543210",
    taxRate: "5",
    gstin: "33BSZPT0242D1ZM",
    paymentTerms: "Immediate",
    signature: "",
    notes: "Thank you for your business.",
  };

  const info = { ...defaultCompanyInfo, ...companyInfo };

  // Create new document
  const doc = new jsPDF();

  // Try to setup font - fallback to standard fonts if fails
  // const fontLoaded = setupFont(doc);

  // Set document properties
  doc.setProperties({
    title: `Tax Invoice-${invoice.id.slice(0, 6)}`,
    subject: `Invoice for ${invoice.customerName}`,
    author: info.name,
    creator: info.name,
  });

  // Define colors
  const primaryColor = [0, 128, 0]; // Green
  const secondaryColor = [100, 100, 100]; // Dark gray
  const lightGrayColor = [240, 240, 240]; // Light gray for backgrounds

  // Helper for text formatting
  const formatLongText = (text: string, maxChars = 40) => {
    if (!text || text.length <= maxChars) return [text];

    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).length <= maxChars) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Format date to look like "02/05/2023"
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date
      .toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "/");
  };

  // Format currency properly
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
  };

  // Generate invoice number
  const invoiceNumber = `INV${invoice.id.slice(0, 6)}/${new Date(
    invoice.createdAt
  )
    .getFullYear()
    .toString()
    .slice(-2)}-${(new Date(invoice.createdAt).getFullYear() + 1)
    .toString()
    .slice(-2)}`;

  // Document starts at y = 10mm
  let y = 10;

  // Section 1: Header with Company Info and Invoice Title

  // Try to add company logo
  let logoSuccess = false;
  if (info.logo) {
    try {
      // Match the template dimensions: width=32, height=16
      logoSuccess = await addImageToDoc(doc, info.logo, 15, y, 32, 16);
    } catch (error) {
      console.error("Failed to add logo:", error);
      logoSuccess = false;
    }
  }

  // If logo failed or doesn't exist, draw a circle with initial
  if (!logoSuccess) {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.ellipse(25, y + 10, 10, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(info.name.charAt(0).toUpperCase(), 23, y + 14);
  }

  // Company Name (as a header) - position below logo, not beside it
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(info.name.toUpperCase(), 15, logoSuccess ? y + 30 : y + 25);

  // Company Address Block - adjust positions based on company name position
  doc.setFont("sans-serif", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(info.address, 15, y + 38);
  doc.text(info.city, 15, y + 43);
  doc.text(info.country, 15, y + 48);

  if (info.gstin) {
    doc.text(`GSTIN ${info.gstin}`, 15, y + 53);
  }

  // Invoice Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", 195, y + 15, { align: "right" });

  y += 60; // Increase space after header to account for repositioned elements

  // Section 2: Invoice Info and Bill/Ship To
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Invoice details
  doc.text("Invoice No", 15, y);
  doc.text(":", 50, y);
  doc.text(invoiceNumber, 55, y);

  doc.text("Invoice Date", 15, y + 6);
  doc.text(":", 50, y + 6);
  doc.text(formatDate(invoice.createdAt), 55, y + 6);

  doc.text("Payment Terms", 15, y + 12);
  doc.text(":", 50, y + 12);
  doc.text(info.paymentTerms || "Immediate", 55, y + 12);

  // Bill To section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", 15, y + 24);

  doc.setFont("helvetica", "normal");
  doc.text("Non GST Customer", 15, y + 30);
  doc.text(invoice.customerName, 15, y + 36);

  // Handle multi-line addresses
  const addressLines = formatLongText(invoice.deliveryAddress || "", 40);
  addressLines.forEach((line, index) => {
    doc.text(line, 15, y + 42 + index * 6);
  });

  // Ship To section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Ship To", 120, y + 24);

  doc.setFont("helvetica", "normal");
  doc.text("Non GST Customer", 120, y + 30);
  doc.text(invoice.customerName, 120, y + 36);

  // Use same address for ship to
  addressLines.forEach((line, index) => {
    doc.text(line, 120, y + 42 + index * 6);
  });

  y += 60; // Move down for items table

  // Calculate tax rates
  const taxRate = parseFloat(info.taxRate || "0") / 100;
  const cgstRate = taxRate / 2;
  const sgstRate = taxRate / 2;

  // Section 3: Items Table with CGST and SGST
  const items = invoice.items.map((item, index) => {
    const itemAmount = (item.price || item.unitPrice || 0) * item.quantity;
    return [
      (index + 1).toString(),
      item.name || item.productName || "",
      item.quantity.toString(),
      formatCurrency(item.price || item.unitPrice || 0),
      formatCurrency(itemAmount),
      (cgstRate * 100).toFixed(1),
      formatCurrency(itemAmount * cgstRate),
      (sgstRate * 100).toFixed(1),
      formatCurrency(itemAmount * sgstRate),
    ];
  });

  // Ensure we have at least 3 rows
  while (items.length < 3) {
    items.push([
      "",
      "",
      "",
      "",
      "",
      (cgstRate * 100).toFixed(1),
      "0.00",
      (sgstRate * 100).toFixed(1),
      "0.00",
    ]);
  }

  // Calculate totals
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + (item.price || item.unitPrice || 0) * item.quantity,
    0
  );
  const cgstAmount = subtotal * cgstRate;
  const sgstAmount = subtotal * sgstRate;
  const total = subtotal + cgstAmount + sgstAmount;
  const totalRounded = Math.round(total);

  // Define the table
  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: "S.No", rowSpan: 2 },
        { content: "Description", rowSpan: 2 },
        { content: "Qty", rowSpan: 2 },
        { content: "Unit Price", rowSpan: 2 },
        { content: "Net Price", rowSpan: 2 },
        { content: "CGST", colSpan: 2 },
        { content: "SGST", colSpan: 2 },
      ],
      ["Rate %","Amount", "Rate %", "Amount"],
    ],
    body: items,
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 25, halign: "right" },
      7: { cellWidth: 15, halign: "center" },
      8: { cellWidth: 25, halign: "right" },
    },
    styles: {
      cellPadding: 3,
      fontSize: 9,
    },
    didDrawPage: (data) => {
      y = data.cursor.y; // Update the y position
    },
  });

  y += 10; // Space after table

  // Section 4: Amount in Words and Totals

  // Amount in words
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Amount in words", 15, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const amountWords = toWords(totalRounded);
  doc.text(amountWords, 15, y + 6);

  // Totals
  const totalsX = 130;
  const totalsRightX = 195;

  doc.line(totalsX, y - 5, totalsRightX, y - 5);

  // Subtotal row
  doc.setFontSize(9);
  doc.text("Subtotal", totalsX, y);
  doc.text(formatCurrency(subtotal), totalsRightX, y, { align: "right" });
  y += 5;

  // CGST row
  doc.text("CGST", totalsX, y);
  doc.text(formatCurrency(cgstAmount), totalsRightX, y, { align: "right" });
  y += 5;

  // SGST row
  doc.text("SGST", totalsX, y);
  doc.text(formatCurrency(sgstAmount), totalsRightX, y, { align: "right" });
  y += 5;

  // Total row
  doc.text("Total", totalsX, y);
  doc.text(formatCurrency(total), totalsRightX, y, { align: "right" });
  y += 5;

  // Grand Total (rounded) with proper rupee symbol
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total (Rounded off)", totalsX, y);

  // Use "Rs." instead of the unicode rupee symbol which has display issues
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${totalRounded}`, totalsRightX, y, { align: "right" });

  y += 20; // Space before final sections

  // Section 5: Notes and Signature

  // Invoice Notes
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Notes:", 15, y);

  doc.setFont("helvetica", "normal");
  // Use invoice notes if available, otherwise use company default notes
  const notesText =
    invoice.notes && invoice.notes.trim() !== ""
      ? invoice.notes
      : info.notes || "Thank you for your business.";
  doc.text(notesText, 15, y + 6);

  // Try to add signature image
  const signatureY = y;
  let signatureSuccess = false;
  if (info.signature) {
    try {
      signatureSuccess = await addImageToDoc(
        doc,
        info.signature,
        150,
        y - 15,
        40,
        20
      );
    } catch (error) {
      console.error("Failed to add signature:", error);
      signatureSuccess = false;
    }
  }

  // Signature
  doc.setFont("helvetica", "bold");
  doc.text(
    "Authorized Signature",
    totalsRightX,
    signatureY + (signatureSuccess ? 10 : 0),
    { align: "right" }
  );

  // Payment info
  y += 15;
  if (invoice.paidStatus) {
    doc.setFont("helvetica", "bold");
    doc.text("Payment Status:", 15, y);

    // Payment status - color coded
    if (invoice.paidStatus === "paid") {
      doc.setTextColor(0, 128, 0); // Green for paid
    } else {
      doc.setTextColor(200, 0, 0); // Red for unpaid
    }
    doc.setFont("helvetica", "normal");
    doc.text(invoice.paidStatus.toUpperCase(), 50, y);
  }

  // Payment method if available and not empty
  if (invoice.paymentMethod && invoice.paymentMethod.trim() !== "") {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Method:", 15, y + 7);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.paymentMethod, 50, y + 7);
  }

  // Payment reference if available and not empty
  if (invoice.paymentReference && invoice.paymentReference.trim() !== "") {
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Reference:", 15, y + 14);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.paymentReference, 50, y + 14);
  }

  // Footer with company contact info
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Email: ${info.email} | Phone: ${info.phone}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: "center" }
  );

  return doc;
};
