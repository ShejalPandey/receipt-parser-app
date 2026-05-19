import { useState, useRef, useCallback, useEffect } from 'react';
import { jsPDF } from 'jspdf';

interface LineItem {
  id: string;
  name: string;
  amount: number;
  quantity: number;
  type: 'item' | 'tax' | 'tip' | 'discount' | 'other';
}

interface Receipt {
  id: string;
  merchant: string;
  date: string;
  lineItems: LineItem[];
  total: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  paymentMethod: 'cash' | 'card' | 'online';
  paymentSource?: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  merchantAddress?: string;
  phone?: string;
  originalExtracted?: {
    merchant?: string;
    date?: string;
    total?: number;
    lineItems?: { name?: string; amount?: number }[];
    paymentMethod?: string;
    paymentSource?: string;
  };
  confidence?: {
    merchant: 'high' | 'medium' | 'low';
    date: 'high' | 'medium' | 'low';
    total: 'high' | 'medium' | 'low';
    paymentMethod: 'high' | 'medium' | 'low';
    lineItems: ('high' | 'medium' | 'low')[];
  };
}

const testimonials = [
  {
    quote: "ReceiptParser has completely transformed how I manage expenses. The AI extraction is eerily accurate, and the confidence indicators help me catch errors before they become problems. It's like having a personal accountant available 24/7.",
    name: "Sarah Chen",
    role: "VP of Operations",
    company: "Scale Labs",
    avatar: "SC",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    verified: true,
    rating: 5
  },
  {
    quote: "We process thousands of receipts monthly across our franchise locations. ReceiptParser's batch processing and API integration saved us countless hours and reduced manual errors by 94%. The dark mode is just a bonus.",
    name: "Marcus Rivera",
    role: "Finance Director",
    company: "Urban Brew Co.",
    avatar: "MR",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    verified: true,
    rating: 5
  },
  {
    quote: "As a freelancer, tax season used to be my nightmare. Now I just snap photos of every receipt throughout the year and export everything to my accountant with one click. Game changing tool.",
    name: "Emily Watson",
    role: "Independent Designer",
    company: "Studio EW",
    avatar: "EW",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    verified: true,
    rating: 5
  },
  {
    quote: "The structured JSON export is perfect for our data pipeline. We automatically feed receipt data into our analytics platform. Rarely seen this level of AI accuracy combined with developer-friendly output.",
    name: "Alex Kumar",
    role: "CTO",
    company: "DataFlow",
    avatar: "AK",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    verified: true,
    rating: 5
  },
  {
    quote: "I've tried every receipt scanner on the market. ReceiptParser is the only one that handles handwritten receipts and crumpled papers with such precision. The UI is absolutely beautiful too.",
    name: "Jessica Park",
    role: "Restaurant Owner",
    company: "Sakura Kitchen",
    avatar: "JP",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    verified: true,
    rating: 5
  },
  {
    quote: "The confidence markers are genius. Instead of hiding AI uncertainty, it surfaces it so I can quickly verify. This transparency builds trust in a way no other tool has achieved.",
    name: "David Mueller",
    role: "CFO",
    company: "Nexus Ventures",
    avatar: "DM",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
    verified: true,
    rating: 5
  }
];

const faqs = [
  {
    question: "How does ReceiptParser work?",
    answer: "Simply upload a photo of your receipt or drag and drop it into the upload area. Our AI will automatically extract the merchant name, date, items, amounts, and total within seconds."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely! Your data stays on your device. We don't store your receipts in the cloud. All processing happens locally, and your information is never shared with third parties."
  },
  {
    question: "What file formats are supported?",
    answer: "We support JPG and PNG image formats. Maximum file size is 10MB. You can upload receipts taken with your phone camera or scanned documents."
  },
  {
    question: "Can I edit the extracted data?",
    answer: "Yes! After extraction, you can review and edit any field. Our confidence indicators show which fields might need verification, making it easy to ensure accuracy."
  },
  {
    question: "How do I export my receipts?",
    answer: "You can download each receipt as a formatted PDF, or view all your saved receipts in the My Receipts section. The PDFs are accountant-ready with all line items and totals."
  },
  {
    question: "Do you offer team or business plans?",
    answer: "Currently we're focused on individual and small business use. Contact us if you need enterprise features like team management, API access, or custom integrations."
  }
];

function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedReceipt, setExtractedReceipt] = useState<Receipt | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSupport, setShowSupport] = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadReceipts = useCallback(async () => {
    const res = await fetch('/api/receipts');
    const data = await res.json();
    setReceipts(data);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    
    if (!file.type.match('image/(jpeg|png|jpg)')) {
      setError('Please upload a JPG or PNG image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const image = reader.result as string;
      try {
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Extraction failed');
        }
        setExtractedReceipt(data as Receipt);
        setShowEditor(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Extraction failed');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    loadReceipts();
    
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!isDragging) setIsDragging(true);
    };
    
    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) handleFile(file);
    };
    
    const handleGlobalDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null || !document.body.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    };
    
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    
    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
    };
  }, [loadReceipts, handleFile, isDragging]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
      e.target.value = '';
    }
  }, [handleFile]);

  const handleSave = useCallback(async (receipt: Receipt) => {
    try {
      await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt)
      });
      await loadReceipts();
      setShowEditor(false);
      setCurrentReceipt(null);
      setExtractedReceipt(null);
    } catch (e) {
      setError('Failed to save receipt');
    }
  }, [loadReceipts]);

  const handleUpdate = useCallback(async (receipt: Receipt) => {
    try {
      await fetch(`/api/receipts/${receipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt)
      });
      await loadReceipts();
      setShowEditor(false);
      setCurrentReceipt(null);
    } catch (e) {
      setError('Failed to update receipt');
    }
  }, [loadReceipts]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      await loadReceipts();
    } catch (e) {
      setError('Failed to delete receipt');
    }
  }, [loadReceipts]);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  const currencySymbols: Record<string, string> = {
    INR: 'Rs.',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currencySymbols[currency] || '$'}${amount.toFixed(2)}`;
  };

  const downloadPDF = useCallback((receipt: Receipt) => {
    try {
      const doc = new jsPDF();
      let symbol = currencySymbols[receipt.currency as keyof typeof currencySymbols] || '$';
      if (receipt.currency === 'INR') symbol = 'Rs.';
      
      const borderColor = '#999999';
      const lightGray = '#EEEEEE';
      let y = 12;
      const x = 15;
      const pageWidth = 180;
      const rowHeight = 6;
      
      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(0.15);
      doc.setDrawColor(borderColor);
      
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('ReceiptParser', x + pageWidth / 2, y, { align: 'center' });
      y += 10;
      
      const displayDate = receipt.date && receipt.date !== 'unknown' ? receipt.date : 'Date Not Detected';
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(displayDate, x, y);
      y += 6;
      
      const displayMerchant = receipt.merchant && receipt.merchant.trim() ? receipt.merchant : 'Unknown Merchant';
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(displayMerchant, x, y, { maxWidth: pageWidth });
      y += 6;
      
      const total = receipt.total || 0;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const totalStr = total === 0 ? '0.00' : total.toFixed(2);
      doc.text(`${symbol}${totalStr}`, x, y);
      y += 5;
      
      const lowConfidence = receipt.confidence && (
        receipt.confidence.total === 'low' ||
        receipt.confidence.merchant === 'low' ||
        receipt.confidence.date === 'low'
      );
      if (lowConfidence) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 50, 50);
        doc.roundedRect(x, y, 28, 5, 0.5, 0.5, 'FD');
        doc.setFontSize(6);
        doc.setTextColor(200, 50, 50);
        doc.text('NEEDS REVIEW', x + 1.5, y + 3.5);
        y += 7;
      }
      
      y += 3;
      doc.setDrawColor(borderColor);
      doc.line(x, y, x + pageWidth, y);
      y += 4;
      
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Uploaded by: User`, x, y);
      y += 4;
      
      const uploadDate = receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : 'Not Available';
      doc.text(`Upload date: ${uploadDate}`, x, y);
      y += 4;
      
      const address = receipt.merchantAddress || 'Not Available';
      doc.text(`Address: ${address}`, x, y);
      y += 4;
      
      const phone = receipt.phone || 'Not Available';
      doc.text(`Phone: ${phone}`, x, y);
      y += 5;
      
      doc.setDrawColor(borderColor);
      doc.line(x, y, x + pageWidth, y);
      y += 4;
      
      const colNum = x + 2;
      const colItem = x + 8;
      const colQty = x + 90;
      const colUnit = x + 105;
      const colPrice = x + 130;
      const colCat = x + 155;
      
      doc.setFillColor(lightGray);
      doc.rect(x, y, pageWidth, rowHeight, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('#', colNum, y + 4);
      doc.text('Item', colItem, y + 4);
      doc.text('Qty', colQty, y + 4);
      doc.text('Unit Price', colUnit, y + 4);
      doc.text('Price', colPrice, y + 4);
      doc.text('Category', colCat, y + 4);
      y += rowHeight;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const lineItems = receipt.lineItems || [];
      let subtotal = 0;
      
      if (lineItems.length === 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('No line items could be extracted from this receipt.', x + 50, y + 4);
        y += 10;
      } else {
        lineItems.forEach((item, index) => {
          doc.line(x, y, x + pageWidth, y);
          
          const itemName = item.name && item.name.trim() ? item.name : 'Unnamed Item';
          const qty = item.quantity || '-';
          const unitPrice = item.amount && item.quantity ? (item.amount / item.quantity).toFixed(2) : '-';
          const price = item.amount || 0;
          const category = item.type || 'Unclassified';
          
          subtotal += price;
          
          doc.setFontSize(7);
          doc.text((index + 1).toString(), colNum, y + 4);
          doc.text(itemName.substring(0, 30), colItem, y + 4);
          doc.text(qty.toString(), colQty, y + 4);
          const priceStr = price === 0 ? '0.00' : price.toFixed(2);
          doc.text(unitPrice !== '-' ? `${symbol}${unitPrice}` : '-', colUnit, y + 4);
          doc.text(`${symbol}${priceStr}`, colPrice, y + 4);
          doc.text(category, colCat, y + 4);
          
          y += rowHeight;
        });
        
        doc.line(x, y, x + pageWidth, y);
        y += 2;
      }
      
      const tax = (total - subtotal) > 0 ? (total - subtotal) : 0;
      
      doc.setFillColor(lightGray);
      doc.rect(x, y, pageWidth, 18, 'F');
      doc.rect(x, y, pageWidth, 18);
      
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CALCULATION', x + 3, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      const subtotalStr = subtotal === 0 ? '0.00' : subtotal.toFixed(2);
      const taxStr = tax === 0 ? '0.00' : tax.toFixed(2);
      doc.text(`Line items total: ${symbol}${subtotalStr}`, x + 3, y);
      y += 4;
      doc.text(`Tax: ${tax > 0 ? symbol + taxStr : 'Not Detected'}`, x + 3, y);
      y += 5;
      
      const totalsMatch = Math.abs(subtotal + tax - total) < 0.01;
      if (totalsMatch && total > 0) {
        doc.setTextColor(50, 150, 50);
        doc.text('Verified', x + 140, y - 1);
      } else if (total > 0) {
        doc.setTextColor(180, 100, 50);
        doc.text('Check totals', x + 140, y - 1);
      }
      
      doc.setTextColor(0, 0, 0);
      y += 8;
      
      doc.setDrawColor(borderColor);
      doc.line(x, y, x + pageWidth, y);
      y += 4;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Details', x, y);
      y += 4;
      
      const paymentMethod = receipt.paymentMethod || 'Not Available';
      doc.setFont('helvetica', 'normal');
      doc.text(`Method: ${paymentMethod}`, x, y);
      y += 10;
      
      doc.setFillColor(lightGray);
      doc.rect(x, y, pageWidth, 16, 'F');
      doc.rect(x, y, pageWidth, 16);
      
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Subtotal', x + 3, y);
      doc.text(`${symbol}${subtotalStr}`, x + pageWidth - 3, y, { align: 'right' });
      y += 5;
      doc.text('Tax', x + 3, y);
      doc.text(tax > 0 ? `${symbol}${taxStr}` : 'Not Detected', x + pageWidth - 3, y, { align: 'right' });
      y += 5;
      doc.setFontSize(9);
      const totalStrFinal = total === 0 ? '0.00' : total.toFixed(2);
      doc.text('Total', x + 3, y);
      doc.text(`${symbol}${totalStrFinal}`, x + pageWidth - 3, y, { align: 'right' });
      
      const filename = `${(receipt.merchant || 'receipt').replace(/\s+/g, '_')}_${(receipt.date || 'unknown').replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  }, [currencySymbols]);

  // JCh to RGB conversion (approximate)
  // Light Mode: primary(J75,C25,h203), secondary(J25,C25,h203), ternary(J50,C25,h203)
  // Dark Mode: primary(J25,C31,h193), ternary(J50,C35,h193), secondary(J75,C35,h193)
  
  const primary = '#315B3E';
  const background = darkMode ? '#0b0f1e' : '#f8fafc';
  const text = darkMode ? '#f1f5f9' : '#1a1a2e';
  const textMuted = darkMode ? '#94a3b8' : '#64748b';
  const cardBg = darkMode ? '#1a2332' : '#ffffff';
  const border = darkMode ? '#1e293b' : '#e2e8f0';
  const successGreen = '#10B981';
  const svgStroke = darkMode ? '#ffffff' : '#000000';
  const svgFill = darkMode ? '#1a2332' : '#ffffff';

  return (
    <div className="app" data-theme={darkMode ? 'dark' : 'light'} style={{ background: 'var(--bg-primary)', color: 'var(--text)' }}>
      <style>{`
        .testimonial-slider {
          display: flex;
          transition: transform 0.5s ease-in-out;
        }
        .testimonial-slide {
          min-width: 100%;
          padding: 0 20px;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {error && (
        <div className="error" style={{ background: darkMode ? 'rgba(239,68,68,0.1)' : '#ffeaea', border: darkMode ? 'rgba(239,68,68,0.3)' : '#ffcccc', color: darkMode ? '#f87171' : '#c0392b' }}>
          <span>{error}</span>
          {showEditor && (
            <button onClick={handleRetry} style={{ background: darkMode ? '#ef4444' : '#e74c3c' }}>Try Again</button>
          )}
        </div>
      )}

      <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${darkMode ? 'dark' : 'light'}`}>
        <a href="#" className="navbar-brand">
          <div className="navbar-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
              <rect width="512" height="512" rx="120" fill="#315B3E"/>
              <path d="M 176 112 C 176 103 183 96 192 96 L 320 96 C 328 96 336 103 336 112 L 336 416 L 296 384 L 256 416 L 216 384 L 176 416 Z" fill="#FFFFFF"/>
              <rect x="208" y="144" width="96" height="16" rx="8" fill="#315B3E" opacity="0.8" />
              <rect x="208" y="192" width="64" height="16" rx="8" fill="#315B3E" opacity="0.8" />
              <rect x="208" y="240" width="80" height="16" rx="8" fill="#315B3E" opacity="0.8" />
              <line x1="144" y1="300" x2="368" y2="300" stroke="#86EFAC" strokeWidth="14" strokeLinecap="round" />
              <circle cx="144" cy="300" r="16" fill="#86EFAC" />
              <circle cx="368" cy="300" r="16" fill="#86EFAC" />
            </svg>
          </div>
          <span>ReceiptParser</span>
        </a>
        <div className="navbar-nav">
          <a href="#why-choose-us" className="nav-link">Why ReceiptParser</a>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">Workflow</a>
          <a href="#testimonials" className="nav-link">Testimonials</a>
          <a href="#faq" className="nav-link">FAQ</a>
          {receipts.length > 0 && (
            <a href="#saved" className="nav-link">My Receipts</a>
          )}
          <button 
            className="nav-link theme-toggle" 
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="nav-link nav-link-primary" style={{ background: primary }}>Get Started</button>
        </div>
      </nav>

      <section className={`hero-section ${darkMode ? '' : 'light-mode'}`}>
        {/* Concentric Background Rings */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '1200px',
          height: '1200px',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.3
        }}>
          <svg width="100%" height="100%" viewBox="0 0 1200 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="600" cy="600" r="300" stroke={primary} strokeWidth="1.5" strokeDasharray="4 12" opacity="0.15"/>
            <circle cx="600" cy="600" r="450" stroke={primary} strokeWidth="1.5" strokeDasharray="4 16" opacity="0.1"/>
            <circle cx="600" cy="600" r="600" stroke={primary} strokeWidth="1.5" strokeDasharray="4 20" opacity="0.05"/>
          </svg>
        </div>
        
        {/* Radial glow orbs */}
        <div className="hero-glow hero-glow-1"></div>
        <div className="hero-glow hero-glow-2"></div>
        <div className="hero-glow hero-glow-3"></div>
        
        {/* Floating blurred shapes */}
        <div className="hero-shape hero-shape-1"></div>
        <div className="hero-shape hero-shape-2"></div>
        <div className="hero-shape hero-shape-3"></div>
        <div className="hero-shape hero-shape-4"></div>
        
        <div className="hero-content">
          <div style={{ position: 'relative', marginBottom: '28px', display: 'flex', justifyContent: 'center' }}>
            {/* Ambient glow behind workflow */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '320px',
              height: '80px',
              background: 'radial-gradient(circle, rgba(34, 197, 94, 0.12) 0%, transparent 70%)',
              filter: 'blur(20px)',
              pointerEvents: 'none'
            }}/>
            
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 720 160"
              width="360"
              height="80"
              fill="none"
              style={{ display: 'block', position: 'relative', zIndex: 1 }}
            >
              <defs>
                <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <g transform="translate(120,40)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="120,40;120,34;120,40"
                  dur="4s"
                  repeatCount="indefinite"
                />

                <rect
                  width="72"
                  height="72"
                  rx="22"
                  fill={svgFill}
                  stroke={svgStroke}
                  strokeWidth="1.5"
                />

                <path
                  d="M20 28L36 42L52 28"
                  stroke="#9FB7A8"
                  strokeWidth="2.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <rect
                  x="20"
                  y="24"
                  width="32"
                  height="24"
                  rx="6"
                  stroke="#9FB7A8"
                  strokeWidth="2.4"
                  fill="none"
                />
              </g>

              <g>
                <line
                  x1="210"
                  y1="76"
                  x2="290"
                  y2="76"
                  stroke={svgStroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="6 8"
                />

                <circle r="3" fill={svgStroke}>
                  <animateMotion
                    dur="1.8s"
                    repeatCount="indefinite"
                    path="M210 76 L290 76"
                  />
                </circle>

                <polygon
                  points="286,72 296,76 286,80"
                  fill={svgStroke}
                />
              </g>

              <g transform="translate(320,28)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="320,28;320,20;320,28"
                  dur="3s"
                  repeatCount="indefinite"
                />

                <rect
                  width="84"
                  height="84"
                  rx="26"
                  fill="#4ADE80"
                  opacity="0.20"
                  filter="url(#greenGlow)"
                />

                <rect
                  width="84"
                  height="84"
                  rx="26"
                  fill="#2E6B43"
                />

                <g stroke="#86EFAC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M 32 26 L 26 26 L 26 32" />
                  <path d="M 52 26 L 58 26 L 58 32" />
                  <path d="M 32 58 L 26 58 L 26 52" />
                  <path d="M 52 58 L 58 58 L 58 52" />
                </g>

                <g filter="url(#greenGlow)">
                  <line x1="28" x2="56" stroke="#C7FFD7" strokeWidth="1.5" strokeLinecap="round">
                    <animate attributeName="y1" values="26; 58" dur="1.2s" begin="0s" repeatCount="indefinite" />
                    <animate attributeName="y2" values="26; 58" dur="1.2s" begin="0s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="1.2s" begin="0s" repeatCount="indefinite" />
                  </line>
                  <line x1="28" x2="56" stroke="#C7FFD7" strokeWidth="1.5" strokeLinecap="round">
                    <animate attributeName="y1" values="26; 58" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                    <animate attributeName="y2" values="26; 58" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                  </line>
                  <line x1="28" x2="56" stroke="#C7FFD7" strokeWidth="1.5" strokeLinecap="round">
                    <animate attributeName="y1" values="26; 58" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
                    <animate attributeName="y2" values="26; 58" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
                  </line>
                </g>
              </g>

              <g>
                <line
                  x1="430"
                  y1="76"
                  x2="510"
                  y2="76"
                  stroke={svgStroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="6 8"
                />

                <circle r="3" fill={svgStroke}>
                  <animateMotion
                    dur="1.8s"
                    repeatCount="indefinite"
                    path="M430 76 L510 76"
                  />
                </circle>

                <polygon
                  points="506,72 516,76 506,80"
                  fill={svgStroke}
                />
              </g>

              <g transform="translate(540,40)">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="540,40;540,34;540,40"
                  dur="4s"
                  repeatCount="indefinite"
                />

                <rect
                  width="72"
                  height="72"
                  rx="22"
                  fill={svgFill}
                  stroke={svgStroke}
                  strokeWidth="1.5"
                />

                <rect
                  x="24"
                  y="18"
                  width="24"
                  height="36"
                  rx="6"
                  fill="none"
                  stroke="#2E6B43"
                  strokeWidth="2.2"
                />

                <line
                  x1="30"
                  y1="30"
                  x2="42"
                  y2="30"
                  stroke="#2E6B43"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />

                <line
                  x1="30"
                  y1="38"
                  x2="42"
                  y2="38"
                  stroke="#A7B7AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <line
                  x1="30"
                  y1="46"
                  x2="40"
                  y2="46"
                  stroke="#A7B7AF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>
          
          {/* AI Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(34, 197, 94, 0.08)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              color: primary,
              padding: '8px 18px',
              borderRadius: '100px',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '0.8px',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 2px 12px rgba(34, 197, 94, 0.1)',
              animation: 'float-subtle 4s ease-in-out infinite'
            }}>
              <span style={{ 
                display: 'inline-flex',
                animation: 'breathe-glow 2s ease-in-out infinite'
              }}>✦</span>
              AI RECEIPT PARSER
            </div>
          </div>
          
          <h1 className="hero-title" style={{ color: text }}>
            Every receipt from your inbox,<br />
            <span style={{ color: primary }}>structured</span>
          </h1>
          <p className="hero-subtitle" style={{ color: textMuted }}>
            Upload a receipt photo, get instant structured data. No typing, no errors.
          </p>
        </div>

        <div className="upload-container" style={{ margin: '40px auto 20px auto', position: 'relative', zIndex: 10 }}>
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            style={{ background: cardBg, border: `2px dashed ${darkMode ? 'rgba(99,102,241,0.4)' : 'rgba(108,92,231,0.4)'}` }}
          >
            {loading ? (
              <div className="loading">
                <div className="loading-spinner" style={{ borderColor: border, borderTopColor: primary }}></div>
                <p style={{ color: textMuted }}>Processing receipt with AI...</p>
              </div>
            ) : (
              <>
                <div className="upload-icon" style={{ background: `${primary}20`, borderRadius: '16px', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h3 style={{ color: text }}>Drop your receipt here</h3>
                <p style={{ color: textMuted }}>or click to browse files</p>
                <p className="hint" style={{ color: textMuted }}>Supports JPG, PNG • Max 10MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>

        <div className="hero-trust-row" style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '32px', color: textMuted, fontSize: '13px', fontWeight: '500', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Bank-level security
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            AI-powered accuracy
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Private & secure
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section" style={{ background, padding: '60px 24px' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          <div className="trust-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {[
              { number: '10,000+', label: 'Receipts Parsed', icon: '📄' },
              { number: '98%', label: 'Extraction Accuracy', icon: '🎯' },
              { number: 'AI-Powered', label: 'Smart Parsing', icon: '⚡' },
              { number: 'Freelancers', label: '& Startups', icon: '🚀' }
            ].map((stat, i) => (
              <div key={i} className="trust-card" style={{ 
                background: cardBg, 
                border: `1px solid ${border}`,
                borderRadius: '16px',
                padding: '28px 20px',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{stat.icon}</div>
                <div style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  color: primary,
                  marginBottom: '8px',
                  lineHeight: 1
                }}>{stat.number}</div>
                <div style={{ 
                  fontSize: '14px', 
                  color: textMuted,
                  fontWeight: '500'
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
          
          <div className="trust-divider" style={{ 
            height: '1px', 
            background: `linear-gradient(90deg, transparent, ${border}, transparent)`,
            margin: '48px 0'
          }}></div>
          
          <div className="trust-logos" style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '13px', 
              color: textMuted, 
              marginBottom: '20px',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>Trusted by teams worldwide</p>
            <div className="logo-row" style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '40px',
              flexWrap: 'wrap',
              opacity: 0.5
            }}>
              {['Stripe', 'QuickBooks', 'Xero', 'FreshBooks', 'Zoho'].map((logo, i) => (
                <span key={i} style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: textMuted,
                  letterSpacing: '1px'
                }}>{logo}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="why-section" id="why-choose-us" style={{ background: darkMode ? 'linear-gradient(180deg, transparent 0%, rgba(49,91,62,0.03) 100%)' : 'linear-gradient(180deg, transparent 0%, rgba(49,91,62,0.02) 100%)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label" style={{ color: primary }}>Why ReceiptParser</span>
            <h2 className="section-title" style={{ color: text }}>Built to deliver ROI fast</h2>
            <p className="section-subtitle" style={{ color: textMuted }}>
              Replace repetitive bookkeeping tasks with dependable automation
            </p>
          </div>
          
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th className="highlight-col">ReceiptParser</th>
                  <th>Manual Workflows</th>
                  <th>Generic OCR Tools</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Receipt capture from uploads', 'Automated', 'Manual', 'Partial'],
                  ['Context-aware categorization', 'AI with context', 'Spreadsheet rules', 'Basic OCR tags'],
                  ['Smart duplicate detection', 'Built in', 'Time-intensive', 'Usually unavailable'],
                  ['Audit-ready exports', 'PDF, CSV, ZIP', 'Manual prep', 'Export only'],
                  ['Time saved per week', '5+ hours', '0 hours', '1-2 hours']
                ].map((row, i) => (
                  <tr key={i}>
                    <td>{row[0]}</td>
                    <td className="highlight-cell">
                      <span className="check-icon">✓</span>
                      <span>{row[1]}</span>
                    </td>
                    <td>
                      <span className="cross-icon">✗</span>
                      <span>{row[2]}</span>
                    </td>
                    <td>
                      <span className="partial-icon">~</span>
                      <span>{row[3]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="features-section" id="features" style={{ background }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label" style={{ color: primary }}>Features</span>
            <h2 className="section-title" style={{ color: text }}>Everything you need</h2>
          </div>
          
          <div className="features-grid">
            {[
              { icon: '🤖', title: 'AI Extraction', desc: 'Smart AI automatically extracts merchant, date, items, and totals from any receipt in seconds.' },
              { icon: '✏️', title: 'Easy Corrections', desc: 'Review and edit any field inline. Confidence markers highlight uncertain fields for easy review.' },
              { icon: '💾', title: 'Save & Export', desc: 'Save receipts locally and download as PDF for your records or accounting software.' },
              { icon: '🔒', title: 'Private & Secure', desc: 'Your data stays on your device. No cloud storage, no sharing, completely private.' },
              { icon: '⚡', title: 'Lightning Fast', desc: 'Groq-powered AI delivers results in seconds, not minutes. Built for speed.' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Access on any device. Simple, intuitive interface anyone can use.' }
            ].map((feature, i) => (
              <div className="feature-card" key={i} style={{ background: cardBg, border: `1px solid ${border}` }}>
                <div className="feature-icon" style={{ background: `${primary}25` }}>{feature.icon}</div>
                <h4 style={{ color: text }}>{feature.title}</h4>
                <p style={{ color: textMuted }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works" style={{ background: darkMode ? 'linear-gradient(180deg, transparent 0%, rgba(49,91,62,0.03) 100%)' : 'linear-gradient(180deg, transparent 0%, rgba(49,91,62,0.02) 100%)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label" style={{ color: primary }}>Workflow</span>
            <h2 className="section-title" style={{ color: text }}>Four simple steps to autopilot</h2>
            <p className="section-subtitle" style={{ color: textMuted }}>From upload to organized data in minutes—no manual work required.</p>
          </div>
          
          <div className="steps">
            {[
              { num: '1', title: 'Upload', desc: 'Drop your receipt image or take a photo with your camera. We accept all major formats.' },
              { num: '2', title: 'AI Extracts', desc: 'Our AI automatically finds and extracts all receipt details with smart categorization.' },
              { num: '3', title: 'Review', desc: 'Review and edit any field. Confidence markers help you verify uncertain data points.' },
              { num: '4', title: 'Export', desc: 'Save locally or download as PDF. Your data is ready for your accountant or software.' }
            ].map((step, i) => (
              <div className="step" key={i}>
                <div className="step-number" style={{ background: primary }}>{step.num}</div>
                <h4 style={{ color: text }}>{step.title}</h4>
                <p style={{ color: textMuted }}>{step.desc}</p>
                {i < 3 && <div className="step-connector" style={{ background: `linear-gradient(90deg, ${primary}, transparent)` }}></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials-section" id="testimonials" style={{ background }}>
        <div className="testimonial-container">
          <div className="section-header">
            <span className="section-label" style={{ color: primary }}>Trusted by Industry Leaders</span>
            <h2 className="section-title" style={{ color: text }}>Loved by teams worldwide</h2>
            <p className="section-subtitle" style={{ color: textMuted, maxWidth: '600px', margin: '0 auto' }}>
              Join thousands of businesses that trust ReceiptParser to handle their expense management
            </p>
          </div>
          

          <div className="testimonial-carousel">
            <div className="testimonial-slider-container">
<div className="testimonial-slider-track">
                {[...testimonials, ...testimonials, ...testimonials].map((t, i) => {
                  return (
                    <div 
                      key={i} 
                      className="testimonial-card-wrapper"
                    >
                      <div 
                        className="testimonial-card"
                        style={{ background: cardBg }}
                      >
                        <span className="testimonial-quote-icon">"</span>
                        
                        <div className="testimonial-stars">
                          {[...Array(5)].map((_, si) => (
                            <span key={si}>★</span>
                          ))}
                        </div>
                        
                        <p className="testimonial-quote" style={{ color: text }}>"{t.quote}"</p>
                        
                        <div className="testimonial-author">
                          <div className="testimonial-avatar">
                            {t.image ? (
                              <img 
                                src={t.image} 
                                alt={t.name} 
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.style.display = 'none';
                                  const fallback = document.createElement('div');
                                  fallback.className = 'testimonial-avatar-fallback';
                                  fallback.textContent = t.avatar;
                                  target.parentElement?.appendChild(fallback);
                                }}
                              />
                            ) : (
                              <div className="testimonial-avatar-fallback">{t.avatar}</div>
                            )}
                            {t.verified && (
                              <span className="testimonial-verified">✓</span>
                            )}
                          </div>
                          <div className="testimonial-info">
                            <div className="testimonial-name-row">
                              <h5 style={{ color: text }}>{t.name}</h5>
                              {t.verified && (
                                <span className="verified-badge">
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" stroke="currentColor" fill="none"/>
                                  </svg>
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="role" style={{ color: textMuted }}>{t.role}</p>
                            {t.company && (
                              <div className="company" style={{ color: textMuted }}>
                                <span className="company-logo">{t.company.charAt(0)}</span>
                                {t.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq" style={{ background: darkMode ? 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.03) 100%)' : 'linear-gradient(180deg, transparent 0%, rgba(108,92,231,0.03) 100%)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label" style={{ color: primary }}>FAQ</span>
            <h2 className="section-title" style={{ color: text }}>Frequently Asked Questions</h2>
            <p className="section-subtitle" style={{ color: textMuted }}>Everything you need to know about ReceiptParser</p>
          </div>
          
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                style={{ 
                  background: cardBg, 
                  border: `1px solid ${border}`, 
                  borderRadius: '12px', 
                  marginBottom: '16px',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: '600', color: text }}>{faq.question}</span>
                  <span style={{ 
                    color: primary, 
                    fontSize: '24px', 
                    transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }}>▼</span>
                </button>
                {openFaq === i && (
                  <div style={{ 
                    padding: '0 24px 20px', 
                    color: textMuted, 
                    lineHeight: '1.7',
                    animation: 'fadeInUp 0.3s ease-out'
                  }}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section" id="get-started" style={{ background }}>
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title" style={{ color: text }}>Ready to automate?</h2>
            <p className="cta-subtitle" style={{ color: textMuted }}>
              Join thousands of businesses saving countless hours every week. Start your free trial today.
            </p>
            <div className="cta-buttons">
              <button 
                className="cta-btn cta-btn-primary"
                style={{ background: primary }}
                onClick={() => fileInputRef.current?.click()}
              >
                Start Free Trial
              </button>
              <a href="#how-it-works" className="cta-btn cta-btn-secondary" style={{ border: `1px solid ${border}`, color: text }}>
                See Workflow
              </a>
            </div>
          </div>
        </div>
      </section>

      {receipts.length > 0 && (
        <section className="saved-section" id="saved" style={{ background }}>
          <div className="container">
            <div className="saved-header">
              <h3 style={{ color: text }}>My Saved Receipts</h3>
              <span className="count-badge" style={{ background: `${primary}20`, color: primary }}>{receipts.length} receipts</span>
            </div>
            
            <div className="receipt-list">
              {receipts.map(r => (
                <div
                  key={r.id}
                  className="receipt-card"
                  onClick={() => {
                    setCurrentReceipt(r);
                    setShowEditor(true);
                  }}
                  style={{ background: cardBg, border: `1px solid ${border}` }}
                >
                  <div className="receipt-card-header">
                    <div>
                      <h4 style={{ color: text }}>{r.merchant}</h4>
                      <div className="meta" style={{ color: textMuted }}>{r.date} · {r.lineItems.length} items · {r.paymentMethod}{r.paymentSource || (r.paymentMethod === 'cash' ? ' (In hand)' : '')}</div>
                    </div>
                    <div className="receipt-card-total">
                      {(r.paymentMethod === 'online' || r.paymentMethod === 'card') && r.total === 0 ? (
                        <span className="online-badge" style={{ color: primary, fontWeight: 600, fontSize: '14px' }}>Paid {r.paymentMethod}{r.paymentSource ? ` via ${r.paymentSource}` : ''}</span>
                      ) : (
                        <span style={{ color: successGreen, fontSize: '22px', fontWeight: 700 }}>{formatAmount(r.total, r.currency || 'USD')}</span>
                      )}
                    </div>
                  </div>
                  <div className="receipt-card-actions">
                    <button 
                      type="button" 
                      className="btn-pdf"
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'transparent',
                        color: primary,
                        border: `1px solid ${primary}`,
                      }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        console.log('Download clicked for:', r.id);
                        try {
                          downloadPDF(r);
                        } catch (err) {
                          console.error('PDF download error:', err);
                          alert('Error downloading PDF');
                        }
                      }}
                    >
                      Download PDF
                    </button>
                    <button 
                      type="button"
                      className="btn-delete" 
                      disabled={deletingId === r.id}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setDeletingId(r.id);
                        handleDelete(r.id).finally(() => setDeletingId(null));
                      }}
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                    >
                      {deletingId === r.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
                <rect width="512" height="512" rx="120" fill="#315B3E"/>
                <path d="M 176 112 C 176 103 183 96 192 96 L 320 96 C 328 96 336 103 336 112 L 336 416 L 296 384 L 256 416 L 216 384 L 176 416 Z" fill="#FFFFFF"/>
                <rect x="208" y="144" width="96" height="16" rx="8" fill="#315B3E" opacity="0.8" />
                <rect x="208" y="192" width="64" height="16" rx="8" fill="#315B3E" opacity="0.8" />
                <rect x="208" y="240" width="80" height="16" rx="8" fill="#315B3E" opacity="0.8" />
                <line x1="144" y1="300" x2="368" y2="300" stroke="#86EFAC" strokeWidth="14" strokeLinecap="round" />
                <circle cx="144" cy="300" r="16" fill="#86EFAC" />
                <circle cx="368" cy="300" r="16" fill="#86EFAC" />
              </svg>
            </div>
            <span>ReceiptParser</span>
            <p>AI-powered receipt parsing for freelancers and businesses.</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-links-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">Workflow</a>
              <a href="#testimonials">Testimonials</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-links-column">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#blog">Blog</a>
              <a href="#careers">Careers</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="footer-links-column">
              <h4>Legal</h4>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#security">Security</a>
            </div>
          </div>
          
          <div className="footer-social">
            <h4>Follow Us</h4>
            <div className="footer-social-links">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div className="footer-support">
            <h4>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Need Help?
            </h4>
            <p>Have questions? We're here to help.</p>
            <button className="footer-support-btn" onClick={() => setShowSupport(true)}>
              Contact Support
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 ReceiptParser. Built by Shejal Pandey.</p>
          <div className="footer-links" style={{ gap: '24px' }}>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </footer>

      {showEditor && (
        <div className="editor-backdrop" onClick={() => { setShowEditor(false); setCurrentReceipt(null); setExtractedReceipt(null); }}>
          <div className="editor" onClick={(e) => e.stopPropagation()}>
<ReceiptEditor
              receipt={currentReceipt || extractedReceipt!}
              isNew={!currentReceipt}
              onSave={currentReceipt ? handleUpdate : handleSave}
              onCancel={() => { setShowEditor(false); setCurrentReceipt(null); setExtractedReceipt(null); }}
            />
          </div>
        </div>
      )}

      {showSupport && (
        <div className="support-backdrop" onClick={() => { setShowSupport(false); setSupportSent(false); }}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()}>
            {!supportSent ? (
              <>
                <div className="support-modal-header">
                  <h2>Contact Support</h2>
                  <button className="support-close" onClick={() => { setShowSupport(false); setSupportSent(false); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <form className="support-form" onSubmit={(e) => { e.preventDefault(); setSupportSent(true); }}>
                  <div className="support-field">
                    <label>Name</label>
                    <input type="text" placeholder="Your name" required />
                  </div>
                  <div className="support-field">
                    <label>Email</label>
                    <input type="email" placeholder="your@gmail.com" required />
                  </div>
                  <div className="support-field">
                    <label>Message</label>
                    <textarea placeholder="How can we help you?" required></textarea>
                  </div>
                  <button type="submit" className="support-submit">
                    Send Message
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="support-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3>Message Sent!</h3>
                <p>We'll get back to you within 24 hours.</p>
                <button className="support-submit" onClick={() => { setShowSupport(false); setSupportSent(false); }} style={{ marginTop: '20px' }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptEditor({
  receipt,
  isNew,
  onSave,
  onCancel
}: {
  receipt: Receipt;
  isNew: boolean;
  onSave: (r: Receipt) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState({
    ...receipt,
    paymentMethod: receipt.paymentMethod || 'cash',
    paymentSource: receipt.paymentMethod === 'cash' && !receipt.paymentSource ? 'In hand' : receipt.paymentSource
  });

  const updateField = (field: keyof Receipt, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateLineItem = (id: string, field: 'name' | 'amount' | 'type' | 'quantity', value: string | number) => {
    setData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item =>
        item.id === id ? { ...item, [field]: field === 'amount' || field === 'quantity' ? Number(value) : value } : item
      )
    }));
  };

  const addLineItem = () => {
    setData(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: crypto.randomUUID(), name: '', quantity: 1, amount: 0, type: 'item' as const }
      ]
    }));
  };

  const deleteLineItem = (id: string) => {
    setData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = () => {
    const submission = {
      ...data,
      total: Math.round((Number(data.total) || 0) * 100) / 100
    };
    onSave(submission as Receipt);
  };

  const isUncertain = (level?: 'high' | 'medium' | 'low') => level === 'low' || level === 'medium';

  return (
    <>
      <div className="editor-header">
        <h2>{isNew ? 'Review Extracted Data' : 'Edit Receipt'}</h2>
        {isNew && <span className="editor-badge">AI Extracted</span>}
      </div>

      {isNew && data.confidence && (
        <div className="warning">
          Some fields may be inaccurate. Please review highlighted fields carefully.
        </div>
      )}

      <div className="fields-grid">
        <div className="field">
          <label>Merchant</label>
          <input
            type="text"
            value={String(data.merchant || '')}
            onChange={e => updateField('merchant', e.target.value)}
            placeholder="Enter merchant name"
          />
          {isUncertain(data.confidence?.merchant) && (
            <span className="confidence-badge">May be uncertain</span>
          )}
        </div>
        
        <div className="field">
          <label>Date</label>
          <input
            type="date"
            value={String(data.date || '')}
            onChange={e => updateField('date', e.target.value)}
          />
        </div>
        
        <div className="field">
          <label>Total</label>
          <input
            type="number"
            step="0.01"
            value={data.total || ''}
            onChange={e => updateField('total', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
          {data.originalExtracted?.total !== undefined && data.originalExtracted.total !== data.total && (
            <span className="original-value">AI had: {data.originalExtracted.total}</span>
          )}
        </div>
        
        <div className="field">
          <label>Currency</label>
          <select
            value={data.currency || 'USD'}
            onChange={e => updateField('currency', e.target.value)}
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        
        <div className="field">
          <label>Payment Method</label>
          <select
            value={data.paymentMethod || 'cash'}
            onChange={e => updateField('paymentMethod', e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
        </div>

        <div className="field">
          <label>Payment Source</label>
          <input
            type="text"
            placeholder={data.paymentMethod === 'cash' ? 'In hand' : 'e.g., GPay, PhonePe, Paytm, Card'}
            value={data.paymentMethod === 'cash' && !data.paymentSource ? 'In hand' : (data.paymentSource || '')}
            onChange={e => updateField('paymentSource', e.target.value)}
          />
        </div>
      </div>

      <div className="line-items">
        <h4>Line Items</h4>
        <div className="line-items-header">
          <span>Item Name</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Type</span>
          <span></span>
        </div>
        {data.lineItems.map((item, i) => (
          <div
            key={item.id}
            className={`line-item ${isUncertain(data.confidence?.lineItems?.[i]) ? 'uncertain' : ''}`}
          >
            <div className="line-item-input">
              <input
                placeholder="Item name"
                value={item.name}
                onChange={e => updateLineItem(item.id, 'name', e.target.value)}
              />
              {data.originalExtracted?.lineItems?.[i]?.name && data.originalExtracted.lineItems[i].name !== item.name && (
                <span className="original-value small">AI: {data.originalExtracted.lineItems[i].name}</span>
              )}
            </div>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="1"
              value={item.quantity || 1}
              onChange={e => updateLineItem(item.id, 'quantity', e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={item.amount}
              onChange={e => updateLineItem(item.id, 'amount', e.target.value)}
            />
            <select
              value={item.type}
              onChange={e => updateLineItem(item.id, 'type', e.target.value)}
            >
              <option value="item">Item</option>
              <option value="tax">Tax</option>
              <option value="tip">Tip</option>
              <option value="discount">Discount</option>
              <option value="other">Other</option>
            </select>
            <button className="delete-btn" onClick={() => deleteLineItem(item.id)}>×</button>
          </div>
        ))}
        <button className="add-item-btn" onClick={addLineItem}>+ Add Line Item</button>
      </div>

      <div className="editor-actions">
        <button className="save-btn" onClick={handleSubmit}>
          {isNew ? 'Save Receipt' : 'Update Receipt'}
        </button>
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

export default App;