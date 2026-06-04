'use client';

import { useState } from 'react';
import type { Lead, Contact, ScfRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { acceptScfAction, updateScfDetailsAction } from './actions';
import { 
  Loader2, Mail, Phone, MapPin, Building2, User, 
  Pencil, Check, X, ChevronDown, ChevronUp, Plus, PartyPopper 
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
    setSavingDetails(true);
    const res = await updateScfDetailsAction(lead.id, contact?.id, { abn: formData.abn });
    setSavingDetails(false);
    if (res.success) {
      setIsEditingDetails(false);
      lead.abn = formData.abn; // Optimistic update
    } else {
      alert(res.message || 'Failed to update details.');
    }
  };

  const handleSaveContacts = async () => {
    setSavingContacts(true);
    const res = await updateScfDetailsAction(lead.id, contact?.id, {
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      customerServiceEmail: formData.customerServiceEmail,
      customerPhone: formData.customerPhone,
    });
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
    setSubmitting(true);
    const res = await acceptScfAction(lead.id, scf.id);
    
    if (res.success) {
      setSuccess(true);
    } else {
      alert(res.message || 'Failed to accept the form. Please try again.');
    }
    setSubmitting(false);
  };

  const hasAccepted = success || scf.status === 'Accepted';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 font-sans text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#095C7B] to-[#0A7A99] text-white px-6 py-5 flex justify-between items-center shadow-lg sticky top-0 z-40">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          <h1 className="text-xl font-semibold tracking-wide">Service Commencement Form</h1>
          <div className="text-2xl font-bold tracking-tight">mailplus<span className="text-secondary">.</span></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Details, Contacts, Addresses) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Details Card */}
            <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-lg shadow-primary/5 border border-white/40 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                 <h2 className="text-primary text-xl font-bold tracking-tight">Details</h2>
                 {!isEditingDetails && !hasAccepted && (
                   <button onClick={() => setIsEditingDetails(true)} className="bg-primary/10 p-2 rounded-full hover:bg-primary/20 transition-colors ml-auto text-primary">
                     <Pencil className="h-4 w-4" />
                   </button>
                 )}
              </div>
              
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 transition-all ${isEditingDetails ? 'bg-primary/5 p-4 rounded-xl border border-primary/10' : ''}`}>
                <div>
                   <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Customer ID</p>
                   <p className="text-foreground border-b border-dashed border-slate-300 pb-1 font-medium">{lead.entityId || lead.salesRecordInternalId || lead.id.substring(0,8)}</p>
                </div>
                <div>
                   <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Company Name</p>
                   <p className="text-foreground border-b border-dashed border-slate-300 pb-1 font-medium">{lead.companyName}</p>
                </div>
                <div>
                   <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">ABN</p>
                   {isEditingDetails ? (
                      <Input 
                        value={formData.abn} 
                        onChange={e => setFormData({...formData, abn: e.target.value})}
                        placeholder="Enter ABN"
                        className="h-9 text-sm bg-background"
                      />
                   ) : (
                     lead.abn ? (
                       <p className="text-foreground border-b border-dashed border-slate-300 pb-1 font-medium">{lead.abn}</p>
                     ) : (
                       <div className="border border-dashed border-slate-300 rounded-md p-2 flex items-center justify-center text-muted-foreground bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => !hasAccepted && setIsEditingDetails(true)}>
                         <Plus className="h-4 w-4 mr-1"/> <span className="text-xs font-medium">Add ABN</span>
                       </div>
                     )
                   )}
                </div>
                <div>
                   <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Territory</p>
                   <p className="text-foreground border-b border-dashed border-slate-300 pb-1 font-medium">{lead.franchisee || '(Not assigned)'}</p>
                </div>
              </div>
              
              {isEditingDetails && (
                <div className="mt-4 flex justify-end gap-2 animate-in fade-in slide-in-from-top-2">
                   <Button variant="outline" size="sm" onClick={() => { setIsEditingDetails(false); setFormData({...formData, abn: lead.abn || ''}); }} disabled={savingDetails} className="rounded-lg">
                     <X className="h-4 w-4 mr-1"/> Cancel
                   </Button>
                   <Button size="sm" onClick={handleSaveDetails} disabled={savingDetails} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                     {savingDetails ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : <Check className="h-4 w-4 mr-1"/>} Save
                   </Button>
                </div>
              )}
            </div>

            {/* Contacts Card */}
            <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-lg shadow-primary/5 border border-white/40 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                 <h2 className="text-primary text-xl font-bold tracking-tight">Contacts</h2>
                 {!isEditingContacts && !hasAccepted && (
                   <button onClick={() => setIsEditingContacts(true)} className="bg-primary/10 p-2 rounded-full hover:bg-primary/20 transition-colors ml-auto text-primary">
                     <Pencil className="h-4 w-4" />
                   </button>
                 )}
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className={`border border-slate-200 rounded-xl p-5 shadow-sm transition-all ${isEditingContacts ? 'bg-primary/5 border-primary/20' : 'bg-white/50'}`}>
                   <h3 className="text-primary font-semibold mb-4 flex items-center gap-2 text-base"><User className="h-4 w-4 text-secondary"/> Service Contact</h3>
                   {isEditingContacts ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="sm:col-span-2">
                           <label className="text-xs text-slate-500 font-medium mb-1 block">Name</label>
                           <Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="h-9 bg-background" />
                         </div>
                         <div>
                           <label className="text-xs text-slate-500 font-medium mb-1 block">Email</label>
                           <Input value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="h-9 bg-background" type="email" />
                         </div>
                         <div>
                           <label className="text-xs text-slate-500 font-medium mb-1 block">Phone</label>
                           <Input value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} className="h-9 bg-background" type="tel" />
                         </div>
                      </div>
                   ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                        <div className="flex items-center gap-3 sm:col-span-2">
                           <div className="bg-primary/10 p-2 rounded-full"><User className="h-4 w-4 text-primary" /></div> 
                           <span className="font-semibold text-base">{contact?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="bg-primary/10 p-2 rounded-full"><Mail className="h-4 w-4 text-primary" /></div> 
                           {contact?.email ? (
                             <a href={`mailto:${contact.email}`} className="font-medium hover:text-primary transition-colors truncate">{contact.email}</a>
                           ) : (
                             <span className="text-muted-foreground italic">N/A</span>
                           )}
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="bg-primary/10 p-2 rounded-full"><Phone className="h-4 w-4 text-primary" /></div> 
                           {contact?.phone || lead.customerPhone ? (
                             <a href={`tel:${contact?.phone || lead.customerPhone}`} className="font-medium hover:text-primary transition-colors">{contact?.phone || lead.customerPhone}</a>
                           ) : (
                             <span className="text-muted-foreground italic">N/A</span>
                           )}
                        </div>
                     </div>
                   )}
                </div>

                <div className={`border border-slate-200 rounded-xl p-5 shadow-sm transition-all ${isEditingContacts ? 'bg-primary/5 border-primary/20' : 'bg-white/50'}`}>
                   <h3 className="text-primary font-semibold mb-4 flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-secondary"/> Account Payable</h3>
                   {isEditingContacts ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                           <label className="text-xs text-slate-500 font-medium mb-1 block">Email</label>
                           <Input value={formData.customerServiceEmail} onChange={e => setFormData({...formData, customerServiceEmail: e.target.value})} className="h-9 bg-background" type="email" />
                         </div>
                         <div>
                           <label className="text-xs text-slate-500 font-medium mb-1 block">Phone</label>
                           <Input value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="h-9 bg-background" type="tel" />
                         </div>
                       </div>
                   ) : lead.customerServiceEmail?.trim() || lead.customerPhone?.trim() ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700">
                        {lead.customerServiceEmail && (
                          <div className="flex items-center gap-3">
                             <div className="bg-primary/10 p-2 rounded-full"><Mail className="h-4 w-4 text-primary" /></div> 
                             <a href={`mailto:${lead.customerServiceEmail}`} className="font-medium hover:text-primary transition-colors truncate">{lead.customerServiceEmail}</a>
                          </div>
                        )}
                        {lead.customerPhone && (
                          <div className="flex items-center gap-3">
                             <div className="bg-primary/10 p-2 rounded-full"><Phone className="h-4 w-4 text-primary" /></div> 
                             <a href={`tel:${lead.customerPhone}`} className="font-medium hover:text-primary transition-colors">{lead.customerPhone}</a>
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className="border border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => !hasAccepted && setIsEditingContacts(true)}>
                        <Plus className="h-6 w-6 mb-2 text-slate-400"/>
                        <span className="text-sm font-medium">Add Account Payable Details</span>
                     </div>
                   )}
                </div>
              </div>
              
              {isEditingContacts && (
                <div className="mt-4 flex justify-end gap-2 animate-in fade-in slide-in-from-top-2">
                   <Button variant="outline" size="sm" onClick={() => { setIsEditingContacts(false); setFormData({...formData, contactName: contact?.name || '', contactEmail: contact?.email || '', contactPhone: contact?.phone || '', customerServiceEmail: lead.customerServiceEmail || '', customerPhone: lead.customerPhone || ''}); }} disabled={savingContacts} className="rounded-lg">
                     <X className="h-4 w-4 mr-1"/> Cancel
                   </Button>
                   <Button size="sm" onClick={handleSaveContacts} disabled={savingContacts} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                     {savingContacts ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : <Check className="h-4 w-4 mr-1"/>} Save
                   </Button>
                </div>
              )}
            </div>

            {/* Addresses Card */}
            <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-lg shadow-primary/5 border border-white/40 p-6 transition-all duration-300 hover:shadow-xl">
              <h2 className="text-primary text-xl font-bold tracking-tight mb-6">Addresses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="border border-slate-200 rounded-xl p-5 shadow-sm h-full bg-white/50 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                   <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> Site Address</p>
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
                       return (
                         <div className="text-sm text-slate-700 leading-relaxed font-medium">
                           {address1 && <div>{address1 as string}</div>}
                           {street && <div>{street as string}</div>}
                           {(city || state || zip) && (
                             <div>{[city, state, zip].filter(Boolean).join(', ')}</div>
                           )}
                         </div>
                       );
                     } else if (isStringAddress) {
                       return (
                         <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                           {l.address as string}
                         </div>
                       );
                     } else {
                       return (
                         <div className="border border-dashed border-slate-300 rounded-md p-4 flex items-center justify-center text-muted-foreground bg-slate-50/50">
                           <span className="text-xs font-medium">Address missing</span>
                         </div>
                       );
                     }
                   })()}
                </div>

                <div className="border border-slate-200 rounded-xl p-5 shadow-sm h-full bg-white/50 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-secondary/40"></div>
                   <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wider flex items-center gap-1.5"><MapPin className="h-4 w-4 text-secondary" /> Billing Address</p>
                   <p className="text-sm text-slate-600 font-medium italic bg-slate-100 p-2 rounded inline-block">Same as Site Address</p>
                </div>
                
              </div>
            </div>

          </div>

          {/* Right Column (Services, Terms) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Services Card */}
            <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-lg shadow-primary/5 border border-white/40 p-6 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-baseline justify-between gap-3 mb-6">
                 <h2 className="text-primary text-xl font-bold tracking-tight">Services</h2>
                 {scf.startDate && (
                   <span className="text-primary/70 font-medium text-sm bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                     Starts: {
                       new Date(
                         typeof scf.startDate === 'object' && '_seconds' in scf.startDate
                           ? (scf.startDate as any)._seconds * 1000
                           : scf.startDate
                       ).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                     }
                   </span>
                 )}
              </div>

              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider border-b border-slate-200">
                       <tr>
                          <th className="px-5 py-3 font-bold">Service</th>
                          <th className="px-5 py-3 font-bold">Freq</th>
                          <th className="px-5 py-3 font-bold text-right">Price</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                       {(scf.services || []).map((service, idx) => {
                          const freqStr = Array.isArray(service.frequency) 
                             ? service.frequency.join(', ') 
                             : service.frequency;
                          return (
                             <tr key={idx} className="hover:bg-primary/5 transition-colors group">
                                <td className="px-5 py-4 font-semibold text-slate-800">{service.name}</td>
                                <td className="px-5 py-4 text-slate-600">{freqStr}</td>
                                <td className="px-5 py-4 font-bold text-primary text-right whitespace-nowrap">
                                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                                    A${(Number(service.rate) || 0).toFixed(2)}
                                  </span>
                                </td>
                             </tr>
                          );
                       })}
                       {(!scf.services || scf.services.length === 0) && (
                         <tr>
                           <td colSpan={3} className="px-5 py-8 text-center text-slate-500 italic">No services listed</td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
            </div>

            {/* Terms and Notes (Progressive Disclosure) */}
            <div className="bg-card/70 backdrop-blur-md rounded-2xl shadow-lg shadow-primary/5 border border-white/40 overflow-hidden transition-all duration-300 hover:shadow-xl">
               <button 
                 onClick={() => setIsTermsExpanded(!isTermsExpanded)}
                 className="w-full flex items-center justify-between p-6 bg-transparent hover:bg-slate-50/50 transition-colors outline-none"
               >
                 <h2 className="text-primary text-xl font-bold tracking-tight">Terms & Conditions</h2>
                 <div className="bg-slate-100 p-2 rounded-full text-slate-500">
                   {isTermsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                 </div>
               </button>
               
               <div className={`px-6 pb-6 text-[13px] leading-relaxed text-slate-600 transition-all duration-300 overflow-hidden ${isTermsExpanded ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 pb-0'}`}>
                 <p className="mb-4">
                   *Services are further defined at <a href="https://mailplus.com.au/terms-conditions/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">mailplus.com.au/terms-conditions</a>. Services are provided on terms set out at <a href="https://mailplus.com.au/terms-conditions/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">mailplus.com.au/terms-conditions</a>. Surcharges apply (including fuel levies) on a monthly basis in addition to the Price set out above.
                 </p>
                 
                 <p className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <strong className="text-slate-800 block mb-1">Notes:</strong> For Australia Post items collected and delivered to and from the Post Office, quoted price includes the first 16kg of items and excludes GST. Every additional 16kg of items incur a $3.85 charge. Additional charges apply for registered mail ($3.30 per item) and standard parcels ($2.20 per item). MailPlus parcels shipped via ShipMate are not included in these charges.
                   <br/><br/>
                   <span className="font-medium">By accepting this form, you hereby authorise MailPlus to share your contact information with Australia Post.</span>
                 </p>

                 <div className="mb-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6">
                   <div>
                     <strong className="text-slate-800 text-sm mb-2 block">Invoice Cycle:</strong>
                     <ul className="space-y-2">
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div> Service Invoices: <span className="font-semibold text-slate-800">Monthly</span></li>
                       <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary"></div> Product Invoices: <span className="font-semibold text-slate-800">Weekly</span></li>
                     </ul>
                   </div>
                 </div>

                 <p className="mb-4">
                   Please note that the Services are often provided by third-party franchisees, who provide the Services.<br/>
                   By using the Services, you accept and agree that the Services are provided on the terms set out at <a href="https://mailplus.com.au/terms-conditions/" className="text-primary hover:underline font-semibold">mailplus.com.au/terms-conditions</a>, our Privacy Policy and any other terms or conditions contained on the site <a href="https://www.mailplus.com.au" className="text-primary hover:underline font-semibold">www.mailplus.com.au</a> which apply as at the date on which the Service is provided (Terms).<br/>
                   By using the Services, you accept the Terms and represent that you have read and understood the Term and agree to be bound by the Terms. The Services are only offered and provided in accordance with the Terms.
                 </p>

                 <div className="border-l-4 border-secondary pl-4 py-3 bg-secondary/5 rounded-r-xl italic text-slate-700">
                   <strong className="font-bold text-secondary">Please note:</strong> MailPlus and its franchisees do not provide insurance over mail or parcel items. If you require insurance, you are solely responsible for arranging and funding this independently.
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
                    <p className="text-slate-600 text-base font-medium">Thank you! Your Service Commencement Form is confirmed.</p>
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
