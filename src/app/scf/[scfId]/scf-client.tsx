'use client';

import { useState } from 'react';
import type { Lead, Contact, ScfRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { acceptScfAction, updateScfDetailsAction } from './actions';
import { Loader2, Mail, Phone, MapPin, Building2, User, Pencil, Check, X } from 'lucide-react';

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
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="bg-[#095C7B] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
          <h1 className="text-xl font-medium tracking-wide">Service Commencement Form</h1>
          <div className="logo-text">mailplus<span className="logo-plus">.</span></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-6">

        {/* Details Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
             <h2 className="text-primary text-lg font-semibold">Details</h2>
             {!isEditingDetails && !hasAccepted && (
               <button onClick={() => setIsEditingDetails(true)} className="bg-muted p-1.5 rounded-full hover:bg-slate-200 transition-colors ml-auto"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
            <div>
               <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Customer ID</p>
               <p className="text-foreground border-b border-dotted border-border pb-1 font-medium">{lead.entityId || lead.salesRecordInternalId || lead.id.substring(0,8)}</p>
            </div>
            <div>
               <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Company Name</p>
               <p className="text-foreground border-b border-dotted border-border pb-1 font-medium">{lead.companyName}</p>
            </div>
            <div>
               <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">ABN</p>
               {isEditingDetails ? (
                  <Input 
                    value={formData.abn} 
                    onChange={e => setFormData({...formData, abn: e.target.value})}
                    placeholder="Enter ABN"
                    className="h-8 text-sm"
                  />
               ) : (
                 <p className="text-muted-foreground border-b border-dotted border-border pb-1 font-medium">{lead.abn || '(Not available)'}</p>
               )}
            </div>
            <div>
               <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Territory</p>
               <p className="text-foreground border-b border-dotted border-border pb-1 font-medium">{lead.franchisee || '(Not assigned)'}</p>
            </div>
          </div>
          {isEditingDetails && (
            <div className="mt-4 flex justify-end gap-2">
               <Button variant="outline" size="sm" onClick={() => { setIsEditingDetails(false); setFormData({...formData, abn: lead.abn || ''}); }} disabled={savingDetails}><X className="h-4 w-4 mr-1"/> Cancel</Button>
               <Button size="sm" onClick={handleSaveDetails} disabled={savingDetails}>{savingDetails ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : <Check className="h-4 w-4 mr-1"/>} Save</Button>
            </div>
          )}
        </div>

        {/* Contacts Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
             <h2 className="text-primary text-lg font-semibold">Contacts</h2>
             {!isEditingContacts && !hasAccepted && (
               <button onClick={() => setIsEditingContacts(true)} className="bg-muted p-1.5 rounded-full hover:bg-slate-200 transition-colors ml-auto"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
             )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-border rounded-lg p-5 shadow-sm bg-background/50">
               <h3 className="text-primary font-medium mb-4 flex items-center gap-2"><User className="h-4 w-4 text-secondary"/> Service Contact</h3>
               {isEditingContacts ? (
                  <div className="space-y-3">
                     <div>
                       <label className="text-xs text-slate-500 mb-1 block">Name</label>
                       <Input value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="h-8 text-sm" />
                     </div>
                     <div>
                       <label className="text-xs text-slate-500 mb-1 block">Email</label>
                       <Input value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="h-8 text-sm" type="email" />
                     </div>
                     <div>
                       <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                       <Input value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} className="h-8 text-sm" type="tel" />
                     </div>
                  </div>
               ) : (
                 <div className="space-y-3 text-sm text-foreground">
                    <div className="flex items-center gap-3">
                       <div className="bg-muted p-1.5 rounded-full"><User className="h-4 w-4 text-muted-foreground" /></div> 
                       <span className="font-medium">{contact?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="bg-muted p-1.5 rounded-full"><Mail className="h-4 w-4 text-muted-foreground" /></div> 
                       <a href={`mailto:${contact?.email}`} className="underline underline-offset-2 hover:text-primary transition-colors">{contact?.email || 'N/A'}</a>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="bg-muted p-1.5 rounded-full"><Phone className="h-4 w-4 text-muted-foreground" /></div> 
                       <a href={`tel:${contact?.phone}`} className="underline underline-offset-2 hover:text-primary transition-colors">{contact?.phone || lead.customerPhone || 'N/A'}</a>
                    </div>
                 </div>
               )}
            </div>

            <div className="border border-border rounded-lg p-5 shadow-sm bg-background/50">
               <h3 className="text-primary font-medium mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-secondary"/> Account Payable</h3>
               {isEditingContacts ? (
                  <div className="space-y-3">
                     <div>
                       <label className="text-xs text-slate-500 mb-1 block">Email</label>
                       <Input value={formData.customerServiceEmail} onChange={e => setFormData({...formData, customerServiceEmail: e.target.value})} className="h-8 text-sm" type="email" />
                     </div>
                     <div>
                       <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                       <Input value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="h-8 text-sm" type="tel" />
                     </div>
                   </div>
               ) : lead.customerServiceEmail?.trim() ? (
                 <div className="space-y-3 text-sm text-foreground">
                    {lead.customerServiceEmail && (
                      <div className="flex items-center gap-3">
                         <div className="bg-muted p-1.5 rounded-full"><Mail className="h-4 w-4 text-muted-foreground" /></div> 
                         <a href={`mailto:${lead.customerServiceEmail}`} className="underline underline-offset-2 hover:text-primary transition-colors">{lead.customerServiceEmail}</a>
                      </div>
                    )}
                    {lead.customerPhone && (
                      <div className="flex items-center gap-3">
                         <div className="bg-muted p-1.5 rounded-full"><Phone className="h-4 w-4 text-muted-foreground" /></div> 
                         <a href={`tel:${lead.customerPhone}`} className="underline underline-offset-2 hover:text-primary transition-colors">{lead.customerPhone}</a>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="text-sm text-muted-foreground italic mt-2">
                    Not provided. {!hasAccepted && <button onClick={() => setIsEditingContacts(true)} className="text-primary font-medium hover:underline">Add details</button>}
                 </div>
               )}
            </div>
          </div>
          {isEditingContacts && (
            <div className="mt-4 flex justify-end gap-2">
               <Button variant="outline" size="sm" onClick={() => { setIsEditingContacts(false); setFormData({...formData, contactName: contact?.name || '', contactEmail: contact?.email || '', contactPhone: contact?.phone || '', customerServiceEmail: lead.customerServiceEmail || '', customerPhone: lead.customerPhone || ''}); }} disabled={savingContacts}><X className="h-4 w-4 mr-1"/> Cancel</Button>
               <Button size="sm" onClick={handleSaveContacts} disabled={savingContacts}>{savingContacts ? <Loader2 className="h-4 w-4 animate-spin mr-1"/> : <Check className="h-4 w-4 mr-1"/>} Save</Button>
            </div>
          )}
        </div>

        {/* Addresses Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-primary text-lg font-semibold mb-4">Addresses</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-border rounded-lg p-5 shadow-sm h-full bg-background/50">
               <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Site Address</p>
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
                     <div className="text-sm text-foreground leading-relaxed font-medium mt-3">
                       {address1 && <div>{address1 as string}</div>}
                       {street && <div>{street as string}</div>}
                       {(city || state || zip) && (
                         <div>{[city, state, zip].filter(Boolean).join(', ')}</div>
                       )}
                     </div>
                   );
                 } else if (isStringAddress) {
                   return (
                     <div className="text-sm text-foreground leading-relaxed font-medium mt-3 whitespace-pre-wrap">
                       {l.address as string}
                     </div>
                   );
                 } else {
                   return (
                     <p className="text-sm text-muted-foreground mt-3">(None provided)</p>
                   );
                 }
               })()}
            </div>
            <div className="border border-border rounded-lg p-5 shadow-sm h-full bg-background/50">
               <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Billing Address</p>
               <p className="text-sm text-muted-foreground mt-3 italic">(Same as Site Address)</p>
            </div>
            <div className="border border-border rounded-lg p-5 shadow-sm h-full bg-background/50">
               <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Postal Address</p>
               <p className="text-sm text-muted-foreground mt-3 italic">(None provided)</p>
            </div>
          </div>
        </div>

        {/* Services Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-baseline gap-3 mb-6">
             <h2 className="text-primary text-lg font-semibold">Services</h2>
             {scf.startDate && (
               <span className="text-muted-foreground italic text-sm">
                 (Starting on {
                   new Date(
                     typeof scf.startDate === 'object' && '_seconds' in scf.startDate
                       ? (scf.startDate as any)._seconds * 1000
                       : scf.startDate
                   ).toLocaleDateString('en-AU', { day: 'numeric', month: 'numeric', year: 'numeric' })
                 })
               </span>
             )}
          </div>

          <div className="overflow-hidden border border-border rounded-lg">
             <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-xs tracking-wider">
                   <tr>
                      <th className="px-5 py-4 font-semibold">Service Name</th>
                      <th className="px-5 py-4 font-semibold">Frequency</th>
                      <th className="px-5 py-4 font-semibold">Price (exc. GST)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card text-foreground">
                   {(scf.services || []).map((service, idx) => {
                      const freqStr = Array.isArray(service.frequency) 
                         ? service.frequency.join(', ') 
                         : service.frequency;
                      return (
                         <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-4 font-medium">{service.name}</td>
                            <td className="px-5 py-4">{freqStr}</td>
                            <td className="px-5 py-4 font-medium text-primary">A${(Number(service.rate) || 0).toFixed(2)}</td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
        </div>

        {/* Terms and Notes */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-[12px] leading-relaxed text-muted-foreground">
           <p className="mb-3">
             *Services are further defined at <a href="https://mailplus.com.au/terms-conditions/" className="text-primary hover:underline font-medium">https://mailplus.com.au/terms-conditions/</a>. Services are provided on terms set out at <a href="https://mailplus.com.au/terms-conditions/" className="text-primary hover:underline font-medium">https://mailplus.com.au/terms-conditions/</a>. Surcharges apply (including fuel levies) on a monthly basis in addition to the Price set out above.
           </p>
           
           <p className="mb-3">
             <strong className="text-foreground">Notes:</strong> For Australia Post items collected and delivered to and from the Post Office, quoted price includes the first 16kg of items and excludes GST. Every additional 16kg of items incur a $3.85 charge. Additional charges apply for registered mail ($3.30 per item) and standard parcels ($2.20 per item). MailPlus parcels shipped via ShipMate are not included in these charges.
             <br/>
             By accepting this form, you hereby authorise MailPlus to share your contact information with Australia Post.
           </p>

           <div className="mb-5 bg-background p-4 rounded-lg border border-border">
             <strong className="text-foreground text-sm">Invoice Cycle:</strong>
             <ul className="list-disc pl-5 mt-2 space-y-1">
               <li>Service Invoices: Monthly</li>
               <li>Product Invoices: Weekly</li>
             </ul>
           </div>

           <p className="mb-4">
             Please note that the Services are often provided by third-party franchisees, who provide the Services.<br/>
             By using the Services, you accept and agree that the Services are provided on the terms set out at <a href="https://mailplus.com.au/terms-conditions/" className="text-primary hover:underline font-medium">https://mailplus.com.au/terms-conditions/</a>, our Privacy Policy and any other terms or conditions contained on the site <a href="https://www.mailplus.com.au" className="text-primary hover:underline font-medium">www.mailplus.com.au</a> which apply as at the date on which the Service is provided (Terms).<br/>
             By using the Services, you accept the Terms and represent that you have read and understood the Term and agree to be bound by the Terms. The Services are only offered and provided in accordance with the Terms.
           </p>

           <div className="border-l-4 border-secondary pl-4 py-2 bg-secondary/10 rounded-r-lg italic text-foreground">
             <strong className="font-semibold text-secondary-foreground">Please note:</strong> MailPlus and its franchisees do not provide insurance over mail or parcel items. If you require insurance, you are solely responsible for arranging and funding this independently.
           </div>
        </div>

        {/* Actions */}
        {hasAccepted ? (
           <div className="bg-secondary/10 text-primary rounded-xl shadow-sm border border-secondary/20 p-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left">
              <div className="bg-secondary p-3 rounded-full shrink-0">
                 <Check className="w-8 h-8 text-white" />
              </div>
              <div>
                 <h3 className="font-bold text-xl mb-1">Terms & Conditions Accepted</h3>
                 <p className="text-muted-foreground text-base">Thank you. Your Service Commencement Form has been successfully confirmed.</p>
              </div>
           </div>
        ) : (
           <div className="bg-card rounded-xl shadow-md border border-border p-8">
             <div className="flex items-center gap-4 justify-center mb-8 bg-background p-4 rounded-lg border border-border">
                <Checkbox 
                  id="agree" 
                  checked={agreed} 
                  onCheckedChange={(val) => setAgreed(val as boolean)}
                  className="w-6 h-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <label htmlFor="agree" className="text-lg text-foreground font-medium cursor-pointer select-none">
                  I have reviewed and confirmed my information
                </label>
             </div>
             
             <Button 
               onClick={handleAccept} 
               disabled={!agreed || submitting}
               className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg h-16 rounded-xl shadow-sm transition-all hover:shadow-md"
             >
               {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'ACCEPT TERMS & CONDITIONS'}
             </Button>
           </div>
        )}

      </div>
    </div>
  );
}
