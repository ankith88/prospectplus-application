'use client';

import { useState, useRef, useEffect } from 'react';
import type { Lead, Contact, ScfRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { acceptScfAction, updateScfDetailsAction } from './actions';
import { validateABN } from '@/lib/utils';
import { 
  Loader2, Mail, Phone, MapPin, Building2, User, 
  Pencil, Check, X, ChevronDown, ChevronUp, Plus, PartyPopper,
  Calendar, Truck, ShieldAlert, FileText, Share2, Download, FileUp
} from 'lucide-react';

interface ScfClientProps {
  scf: ScfRecord;
  lead: Lead;
  contact: Contact | null;
}

export default function ScfClient({ scf, lead, contact }: ScfClientProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(scf.status === 'Accepted');

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [isTermsExpanded, setIsTermsExpanded] = useState(false);
  const [isFullTermsExpanded, setIsFullTermsExpanded] = useState(false);
  
  const [formData, setFormData] = useState({
    abn: lead.abn || '',
    contactName: contact?.name || '',
    contactEmail: contact?.email || '',
    contactPhone: contact?.phone || '',
    customerServiceEmail: lead.customerServiceEmail || '',
    customerPhone: lead.customerPhone || '',
  });

  const [savingDetails, setSavingDetails] = useState(false);
  const [savingContacts, setSavingContacts] = useState(false);

  const handleSaveDetails = async () => {
    if (hasAccepted) {
      alert('This Service Commencement Form has been signed or accepted and cannot be edited.');
      setIsEditingDetails(false);
      return;
    }
    const cleanedAbn = formData.abn.replace(/\s+/g, '').replace(/-/g, '');
    if (!validateABN(cleanedAbn)) {
      alert('Please enter a valid 11-digit Australian Business Number (ABN).');
      return;
    }
    setSavingDetails(true);
    const res = await updateScfDetailsAction(lead.id, contact?.id, { abn: cleanedAbn }, scf.id);
    setSavingDetails(false);
    if (res.success) {
      setIsEditingDetails(false);
      lead.abn = cleanedAbn; // Optimistic update
      setFormData({...formData, abn: cleanedAbn});
    } else {
      alert(res.message || 'Failed to update details.');
    }
  };

  const handleSaveContacts = async () => {
    if (hasAccepted) {
      alert('This Service Commencement Form has been signed or accepted and cannot be edited.');
      setIsEditingContacts(false);
      return;
    }
    setSavingContacts(true);
    const res = await updateScfDetailsAction(lead.id, contact?.id, {
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      customerServiceEmail: formData.customerServiceEmail,
      customerPhone: formData.customerPhone,
    }, scf.id);
    setSavingContacts(false);
    if (res.success) {
      setIsEditingContacts(false);
      if (contact) {
         contact.name = formData.contactName;
         contact.email = formData.contactEmail;
         contact.phone = formData.contactPhone;
      }
      lead.customerServiceEmail = formData.customerServiceEmail;
      lead.customerPhone = formData.customerPhone;
    } else {
      alert(res.message || 'Failed to update contacts.');
    }
  };

  const handleAccept = async () => {
    if (!agreed) return;

    const abnToCheck = lead.abn || '';
    const cleanedAbn = abnToCheck.replace(/\s+/g, '').replace(/-/g, '');
    if (!validateABN(cleanedAbn)) {
      alert('A valid 11-digit ABN is required in the Details section before accepting the Service Commencement Form.');
      setIsEditingDetails(true);
      return;
    }

    setSubmitting(true);
    const res = await acceptScfAction(lead.id, scf.id);
    
    if (res.success) {
      setSuccess(true);
    } else {
      alert(res.message || 'Failed to accept the form. Please try again.');
    }
    setSubmitting(false);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      if (scf.uploadedPdfUrl) {
        const link = document.createElement('a');
        link.href = scf.uploadedPdfUrl;
        link.target = '_blank';
        link.download = scf.uploadedPdfName || `SCF_${(lead?.companyName || 'Document').replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsDownloadingPdf(false);
        return;
      }

      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      const page1El = page1Ref.current;
      const page2El = page2Ref.current;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const canvasOptions = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1280,
      };

      if (page1El && page2El) {
        // Render Page 1
        const canvas1 = await html2canvas(page1El, canvasOptions);
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.82);
        const imgHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
        pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight1, pdfHeight), undefined, 'FAST');

        // Render Page 2
        pdf.addPage();
        const canvas2 = await html2canvas(page2El, canvasOptions);
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.82);
        const imgHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight2, pdfHeight), undefined, 'FAST');
      } else if (printAreaRef.current) {
        const canvas = await html2canvas(printAreaRef.current, canvasOptions);
        const imgData = canvas.toDataURL('image/jpeg', 0.82);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      }

      pdf.save(`SCF_${(lead?.companyName || 'Document').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('An error occurred while generating the PDF download.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('download=true')) {
      handleDownloadPdf();
    }
  }, []);

  const scfStatus = scf.status as string;
  const hasAccepted = success || scfStatus === 'Accepted' || scfStatus === 'Signed' || scfStatus === 'Quote Accepted' || !!scf.acceptedAt || !!scf.signedAt;

  const getAcceptedDateFormatted = (): string => {
    if (!hasAccepted) {
      return 'Pending Acceptance';
    }
    const dateVal = scf.acceptedAt || scf.signedAt;
    if (dateVal) {
      try {
        const d = new Date(
          typeof dateVal === 'object' && dateVal !== null && '_seconds' in (dateVal as any)
            ? (dateVal as any)._seconds * 1000
            : dateVal
        );
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch (e) {
        console.error('Error formatting accepted date:', e);
      }
    }
    if (scf.updatedAt) {
      try {
        const d = new Date(scf.updatedAt);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch (e) {}
    }
    return new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const acceptedDateFormatted = getAcceptedDateFormatted();

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 font-sans text-slate-800">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#095C7B] to-[#0A7A99] text-white px-6 py-5 flex justify-between items-center shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          <h1 className="text-xl font-semibold tracking-wide">Service Commencement Form</h1>
          <div className="flex items-center gap-3">
            {scf.uploadedPdfUrl && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs sm:text-sm flex items-center gap-1.5"
                onClick={() => window.open(scf.uploadedPdfUrl, '_blank')}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">View Uploaded PDF</span>
                <span className="sm:hidden">Uploaded</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs sm:text-sm flex items-center gap-1.5"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download PDF</span>
            </Button>
            <div className="text-2xl font-bold tracking-tight hidden md:block">mailplus<span className="text-secondary">.</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-8" ref={printAreaRef}>
        
        {/* ==================== PAGE 1 ==================== */}
        {/* ==================== PAGE 1 (Unified Proposal Sheet) ==================== */}
        <div ref={page1Ref} className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden space-y-0">
          
          {/* 1. Integrated Document Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#095C7B] text-white p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <img 
                src="/og-image.jpg" 
                alt="MailPlus Logo" 
                className="h-14 w-auto object-contain rounded-xl bg-white p-1 shadow-md"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Service Commencement Form</h1>
                <p className="text-xs text-slate-300 font-medium mt-0.5">MailPlus Business Logistics &amp; Service Agreement</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 min-w-[210px]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300">Status:</span>
                <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                  hasAccepted 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'bg-amber-400 text-slate-900 shadow-sm'
                }`}>
                  {hasAccepted ? 'ACCEPTED' : 'PENDING ACCEPTANCE'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                <Calendar className="h-3.5 w-3.5 text-[#EAF044]" />
                <span>Accepted Date: </span>
                <span className="font-bold text-white">
                  {acceptedDateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Structured Metadata Grid (Client • Contacts • Locations) */}
          <div className="p-6 sm:p-8 bg-slate-50/80 border-b border-slate-200/80">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm items-stretch">
              
              {/* Column 1: Client Profile */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" /> Client Profile
                  </span>
                  {!isEditingDetails && !hasAccepted && (
                    <button 
                      onClick={() => setIsEditingDetails(true)} 
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>

                <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Company Name</span>
                    <span className="font-bold text-slate-800 text-base leading-tight block">{lead.companyName}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Customer ID:</span>
                    <span className="font-mono font-bold text-slate-700">{lead.entityId || lead.salesRecordInternalId || lead.id.substring(0,8)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">ABN:</span>
                    {isEditingDetails ? (
                      <Input 
                        value={formData.abn} 
                        onChange={e => setFormData({...formData, abn: e.target.value})}
                        placeholder="Enter ABN"
                        className="h-7 text-xs w-32 bg-background"
                      />
                    ) : (
                      <span className="font-semibold text-slate-700">{lead.abn || 'Not provided'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Territory:</span>
                    <span className="font-semibold text-slate-700">{lead.franchisee || '(Unassigned)'}</span>
                  </div>
                </div>

                {isEditingDetails && (
                  <div className="flex justify-end gap-2 pt-1 animate-in fade-in slide-in-from-top-1">
                    <Button variant="outline" size="sm" onClick={() => { setIsEditingDetails(false); setFormData({...formData, abn: lead.abn || ''}); }} disabled={savingDetails} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveDetails} disabled={savingDetails} className="h-7 text-xs bg-primary text-white">
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Column 2: Key Contacts */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary" /> Key Contacts
                  </span>
                  {!isEditingContacts && !hasAccepted && (
                    <button 
                      onClick={() => setIsEditingContacts(true)} 
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>

                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex-1 flex flex-col justify-between">
                  {/* Service Contact */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Service Contact</span>
                    {isEditingContacts ? (
                      <div className="space-y-1.5">
                        <Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="Name" className="h-7 text-xs" />
                        <Input value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} placeholder="Email" className="h-7 text-xs" />
                        <Input value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} placeholder="Phone" className="h-7 text-xs" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-sm leading-snug">{contact?.name || 'N/A'}</p>
                        <p className="text-xs text-slate-600 break-all leading-normal">{contact?.email || 'No email'}</p>
                        <p className="text-xs text-slate-600 leading-normal">{contact?.phone || lead.customerPhone || 'No phone'}</p>
                      </div>
                    )}
                  </div>

                  {/* Account Payable */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Accounts Payable</span>
                    {isEditingContacts ? (
                      <div className="space-y-1.5">
                        <Input value={formData.customerServiceEmail} onChange={e => setFormData({...formData, customerServiceEmail: e.target.value})} placeholder="AP Email" className="h-7 text-xs" />
                        <Input value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} placeholder="AP Phone" className="h-7 text-xs" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700 break-all leading-normal">{lead.customerServiceEmail || 'Same as service contact'}</p>
                        <p className="text-xs text-slate-500 leading-normal">{lead.customerPhone || '-'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {isEditingContacts && (
                  <div className="flex justify-end gap-2 pt-1 animate-in fade-in slide-in-from-top-1">
                    <Button variant="outline" size="sm" onClick={() => { setIsEditingContacts(false); setFormData({...formData, contactName: contact?.name || '', contactEmail: contact?.email || '', contactPhone: contact?.phone || '', customerServiceEmail: lead.customerServiceEmail || '', customerPhone: lead.customerPhone || ''}); }} disabled={savingContacts} className="h-7 text-xs">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveContacts} disabled={savingContacts} className="h-7 text-xs bg-primary text-white">
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Column 3: Site & Billing Addresses */}
              <div className="flex flex-col space-y-3">
                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" /> Service Locations
                </span>

                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex-1 flex flex-col justify-between">
                  {/* Site Address */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Site / Pickup Address</span>
                    {(() => {
                      const l = lead as any;
                      const address1 = typeof lead.address === 'object' ? lead.address?.address1 : l.address1;
                      const street = typeof lead.address === 'object' ? lead.address?.street : l.street;
                      const city = typeof lead.address === 'object' ? lead.address?.city : l.city;
                      const state = typeof lead.address === 'object' ? lead.address?.state : l.state;
                      const zip = typeof lead.address === 'object' ? lead.address?.zip : l.zip;
                      
                      const hasStructuredAddress = street || city || state || zip;
                      const isStringAddress = typeof l.address === 'string' && (l.address as string).trim().length > 0;

                      if (hasStructuredAddress) {
                        const showAddress1 = address1 && String(address1).trim() !== '' && String(address1).toLowerCase() !== 'undefined';
                        return (
                          <div className="text-xs text-slate-700 leading-normal font-medium">
                            {showAddress1 && <div>{address1 as string}</div>}
                            {street && <div>{street as string}</div>}
                            {(city || state || zip) && (
                              <div>{[city, state, zip].filter(Boolean).join(', ')}</div>
                            )}
                          </div>
                        );
                      } else if (isStringAddress) {
                        return (
                          <div className="text-xs text-slate-700 leading-normal font-medium whitespace-pre-wrap">
                            {l.address as string}
                          </div>
                        );
                      } else {
                        return <span className="text-xs text-slate-400 italic">Address missing</span>;
                      }
                    })()}
                  </div>

                  {/* Billing Address */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Billing Address</span>
                    {(() => {
                      const bType = lead.billingAddressType || 'site';
                      let targetAddr: any = null;

                      if (bType === 'postal' && lead.postalAddress && (lead.postalAddress.street || lead.postalAddress.address1 || lead.postalAddress.city)) {
                        targetAddr = lead.postalAddress;
                      } else if (bType === 'custom' && lead.billingAddress && (lead.billingAddress.street || lead.billingAddress.address1 || lead.billingAddress.city)) {
                        targetAddr = lead.billingAddress;
                      } else if (bType !== 'site' && lead.additionalAddresses && Array.isArray(lead.additionalAddresses)) {
                        const match = lead.additionalAddresses.find(a => a.id === bType);
                        targetAddr = match || lead.address;
                      } else {
                        targetAddr = lead.address;
                      }

                      const l = lead as any;
                      const addr1 = typeof targetAddr === 'object' ? targetAddr?.address1 : '';
                      const street = typeof targetAddr === 'object' ? targetAddr?.street : (typeof targetAddr === 'string' ? targetAddr : l.street);
                      const city = typeof targetAddr === 'object' ? targetAddr?.city : l.city;
                      const state = typeof targetAddr === 'object' ? targetAddr?.state : l.state;
                      const zip = typeof targetAddr === 'object' ? targetAddr?.zip : l.zip;

                      const hasStructured = street || city || state || zip;

                      return hasStructured ? (
                        <div className="text-xs text-slate-700 leading-normal font-medium">
                          {addr1 && String(addr1).trim() !== '' && String(addr1).toLowerCase() !== 'undefined' && <div>{addr1 as string}</div>}
                          {street && <div>{street as string}</div>}
                          {(city || state || zip) && (
                            <div>{[city, state, zip].filter(Boolean).join(', ')}</div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Same as Site Address</p>
                      );
                    })()}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3. Commercial Rate Schedule (The Unified Ledger) */}
          <div className="p-6 sm:p-8 space-y-8 bg-white">
            
            {/* Section A: Services Line Items */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h2 className="text-primary text-lg font-bold tracking-tight">Requested Services Schedule</h2>
                </div>
                {scf.startDate && (
                  <span className="text-primary font-bold text-xs bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    Service Starts: {
                      new Date(
                        typeof scf.startDate === 'object' && '_seconds' in scf.startDate
                          ? (scf.startDate as any)._seconds * 1000
                          : scf.startDate
                      ).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                    }
                  </span>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100/90 text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold">Service Description</th>
                      <th className="px-6 py-4 font-bold whitespace-nowrap">Schedule / Freq</th>
                      <th className="px-6 py-4 font-bold text-right whitespace-nowrap">Agreed Rate (Exc GST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(scf.services || []).map((service, idx) => {
                      const freqStr = Array.isArray(service.frequency) 
                        ? service.frequency.join(', ') 
                        : service.frequency;
                      return (
                        <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-6 py-4 font-semibold text-slate-800">{service.name}</td>
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{freqStr}</td>
                          <td className="px-6 py-4 font-bold text-primary text-right whitespace-nowrap">
                            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md font-mono">
                              A${(Number(service.rate) || 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {(!scf.services || scf.services.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">No services listed</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section B: Product Pricing Line Items (if present) */}
            {scf.products && scf.products.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-primary text-lg font-bold tracking-tight">Product &amp; Parcel Rate Card</h2>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                  <table className="w-full text-sm text-left min-w-[560px]">
                    <thead className="bg-slate-100/90 text-slate-700 uppercase text-xs tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-bold">Product / Satchel Tier</th>
                        <th className="px-6 py-4 font-bold whitespace-nowrap">Weight Limit</th>
                        <th className="px-6 py-4 font-bold text-right whitespace-nowrap">Base Price</th>
                        <th className="px-6 py-4 font-bold text-right whitespace-nowrap">Fuel Levy</th>
                        <th className="px-6 py-4 font-bold text-right whitespace-nowrap">Total Rate (Exc GST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {scf.products.map((product: any, idx: number) => {
                        const basePrice = Number(product.salesPriceExcGst || 0);
                        const surchargePerc = product.surchargePerc ?? 12.5;
                        const surchargeAmt = product.surchargeAmt ?? (basePrice * (surchargePerc / 100));
                        const total = product.totalVal ?? (basePrice + surchargeAmt);
                        return (
                          <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                            <td className="px-6 py-4 font-semibold text-slate-800">{product.name || product.id}</td>
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{product.productWeight || '-'}</td>
                            <td className="px-6 py-4 text-slate-600 text-right whitespace-nowrap">A${basePrice.toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-600 text-right whitespace-nowrap">
                              {surchargePerc > 0 ? `A$${surchargeAmt.toFixed(2)} (${surchargePerc}%)` : '-'}
                            </td>
                            <td className="px-6 py-4 font-bold text-primary text-right whitespace-nowrap">
                              <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md font-mono">
                                A${total.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Commercial Schedule Notes */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span><strong>Billing Cycle:</strong> Services invoiced monthly. Products &amp; parcel dispatches invoiced weekly.</span>
              </div>
              <span className="text-slate-400 italic">All prices quoted in AUD, excluding GST.</span>
            </div>

          </div>

        </div>

        {/* ==================== PAGE 2 ==================== */}
        <div ref={page2Ref} className="bg-white/60 backdrop-blur-sm p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-8">
          {/* Top Header Banner for Page 2 */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <img 
                src="/og-image.jpg" 
                alt="MailPlus Logo" 
                className="h-14 w-auto object-contain rounded-lg border border-slate-100 shadow-sm"
              />
              <div>
                <h1 className="text-2xl font-bold text-[#095C7B] tracking-tight">Terms &amp; Conditions</h1>
                <p className="text-xs text-slate-500 font-medium">Service Commencement Agreement - Page 2</p>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 min-w-[220px]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  hasAccepted 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {hasAccepted ? 'ACCEPTED' : 'PENDING ACCEPTANCE'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <Calendar className="h-3.5 w-3.5 text-[#095C7B]" />
                <span>Accepted Date: </span>
                <span className="font-bold text-slate-900">
                  {acceptedDateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Full Terms & Conditions Card (Always fully expanded on Page 2) */}
          <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-lg shadow-primary/5 border border-white/40 p-6 transition-all duration-300">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-primary text-xl font-bold tracking-tight">Standard Terms &amp; Conditions</h2>
             </div>
             
             <div className="text-[13px] leading-relaxed text-slate-600 space-y-4">
               
               {/* 1. Invoice Cycles */}
               <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                 <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold text-sm">
                   <Calendar className="h-4 w-4 text-primary" />
                   <h3>Invoice Cycles</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                     <p className="text-slate-500 font-medium mb-0.5 text-[11px] uppercase tracking-wider">Service Invoices</p>
                     <span className="font-bold text-slate-800 text-sm">Monthly</span>
                   </div>
                   <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                     <p className="text-slate-500 font-medium mb-0.5 text-[11px] uppercase tracking-wider">Product Invoices</p>
                     <span className="font-bold text-slate-800 text-sm">Weekly</span>
                   </div>
                 </div>
               </div>

               {/* 2. AusPost & Surcharges */}
               <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-3">
                 <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                   <Truck className="h-4 w-4 text-primary" />
                   <h3>Australia Post Surcharges</h3>
                 </div>
                 <p className="text-slate-600 leading-relaxed text-xs">
                   For Australia Post items collected and delivered to/from the Post Office. Quoted price includes the first <strong className="text-slate-800">16kg</strong> (excludes GST).
                 </p>
                 
                 <div className="grid grid-cols-3 gap-2 text-center font-medium">
                   <div className="bg-primary/5 text-primary border border-primary/10 p-2 rounded-lg flex flex-col justify-center">
                     <span className="font-bold text-xs">A$3.85</span>
                     <span className="text-[9px] text-slate-500 leading-none mt-1">per extra 16kg</span>
                   </div>
                   <div className="bg-primary/5 text-primary border border-primary/10 p-2 rounded-lg flex flex-col justify-center">
                     <span className="font-bold text-xs">A$3.30</span>
                     <span className="text-[9px] text-slate-500 leading-none mt-1">registered item</span>
                   </div>
                   <div className="bg-primary/5 text-primary border border-primary/10 p-2 rounded-lg flex flex-col justify-center">
                     <span className="font-bold text-xs">A$2.20</span>
                     <span className="text-[9px] text-slate-500 leading-none mt-1">std parcel surcharge</span>
                   </div>
                 </div>
                 
                 <p className="text-[11px] text-slate-400 italic">
                   * MailPlus parcels shipped via ShipMate are not included in these charges. Fuel levies and other surcharges apply monthly.
                 </p>
               </div>

               {/* 3. Authorizations & Operational Info */}
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-3">
                 <div className="flex items-start gap-2.5">
                   <Share2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                   <p className="font-medium">
                     By accepting this form, you authorise MailPlus to share your contact information with Australia Post.
                   </p>
                 </div>
                 <div className="flex items-start gap-2.5 border-t border-slate-200/60 pt-3">
                   <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                   <p>
                     Please note that the Services are often provided by third-party franchisees, who provide the Services.
                   </p>
                 </div>
               </div>

               {/* 4. Critical Insurance Disclaimer */}
               <div className="border-l-4 border-amber-500 pl-4 py-3 bg-amber-500/[0.04] rounded-r-xl text-xs text-slate-700">
                 <div className="flex items-center gap-1.5 font-bold text-amber-600 mb-1">
                   <ShieldAlert className="h-4 w-4" />
                   <span>Insurance Disclaimer</span>
                 </div>
                 <p className="leading-relaxed">
                   MailPlus and its franchisees do not provide insurance over mail or parcel items. If you require insurance, you are solely responsible for arranging and funding this independently.
                 </p>
               </div>

               {/* 5. Full Legal Agreement Terms */}
               <div className="border-t border-slate-200 pt-4 mt-2">
                 <h3 className="font-bold text-xs text-slate-700 mb-2 uppercase tracking-wider">Full Legal Agreement Terms</h3>
                 <div className="text-[11px] leading-relaxed text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                   <p>
                     Services are further defined at <a href="https://mailplus.com.au/terms-conditions/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">mailplus.com.au/terms-conditions</a>. Services are provided on terms set out at <a href="https://mailplus.com.au/terms-conditions/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">mailplus.com.au/terms-conditions</a>.
                   </p>
                   <p>
                     By using the Services, you accept and agree that the Services are provided on the terms set out at <a href="https://mailplus.com.au/terms-conditions/" className="text-primary hover:underline font-semibold">mailplus.com.au/terms-conditions</a>, our Privacy Policy and any other terms or conditions contained on the site <a href="https://www.mailplus.com.au" className="text-primary hover:underline font-semibold">www.mailplus.com.au</a> which apply as at the date on which the Service is provided (Terms).
                   </p>
                   <p>
                     By using the Services, you accept the Terms and represent that you have read and understood the Term and agree to be bound by the Terms. The Services are only offered and provided in accordance with the Terms.
                   </p>
                 </div>
               </div>

             </div>
          </div>

        </div>

      </div>

      {/* Floating Action Bar (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 w-full z-50 p-4 pointer-events-none">
         <div className="max-w-6xl mx-auto pointer-events-auto">
           {hasAccepted ? (
              <div className="bg-white/90 backdrop-blur-xl text-primary rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border border-primary/20 p-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left transform transition-all translate-y-0 animate-in slide-in-from-bottom-10 fade-in duration-500">
                 <div className="bg-gradient-to-br from-green-400 to-green-600 p-4 rounded-full shrink-0 shadow-lg shadow-green-500/30">
                    <PartyPopper className="w-8 h-8 text-white" />
                 </div>
                 <div>
                    <h3 className="font-bold text-2xl mb-1 text-slate-800 tracking-tight">Terms Accepted Successfully</h3>
                    <p className="text-slate-600 text-base font-medium">Accepted on {acceptedDateFormatted}. Your Service Commencement Form is confirmed.</p>
                 </div>
              </div>
           ) : (
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 transform transition-all">
                <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setAgreed(!agreed)}>
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${agreed ? 'bg-primary border-primary shadow-md shadow-primary/30' : 'bg-transparent border-slate-300 group-hover:border-primary/50'}`}>
                     {agreed && <Check className="w-5 h-5 text-white stroke-[3]" />}
                   </div>
                   <span className="text-lg text-slate-800 font-semibold select-none group-hover:text-primary transition-colors">
                     I have reviewed and confirmed my information
                   </span>
                </div>
                
                <Button 
                  onClick={handleAccept} 
                  disabled={!agreed || submitting}
                  className={`w-full sm:w-auto min-w-[240px] font-bold text-lg h-14 rounded-xl shadow-lg transition-all duration-300 ${agreed && !submitting ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 shadow-none'}`}
                >
                  {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'ACCEPT TERMS & CONDITIONS'}
                </Button>
              </div>
           )}
         </div>
      </div>

    </div>
  );
}
