'use client';

import { useState } from 'react';
import type { Lead, Contact, ScfRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { acceptScfAction } from './actions';
import { Loader2, Mail, Phone, MapPin, Building2, User, Pencil } from 'lucide-react';

interface ScfClientProps {
  scf: ScfRecord;
  lead: Lead;
  contact: Contact | null;
}

export default function ScfClient({ scf, lead, contact }: ScfClientProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(scf.status === 'Accepted');

  const handleAccept = async () => {
    if (!agreed) return;
    setSubmitting(true);
    const res = await acceptScfAction(lead.id, scf.id);
    setSubmitting(false);
    if (res.success) {
      setSuccess(true);
    } else {
      alert(res.message || 'Failed to accept the form. Please try again.');
    }
  };

  const hasAccepted = success || scf.status === 'Accepted';

  return (
    <div className="min-h-screen bg-[#dde5d4] pb-12 font-sans">
      {/* Header */}
      <div className="bg-[#005a78] text-white px-6 py-4 flex justify-between items-center max-w-4xl mx-auto shadow-md">
        <h1 className="text-xl font-medium tracking-wide">Service Commencement Form</h1>
        <div className="text-2xl font-bold italic tracking-tighter">mailplus<span className="text-[#f7d61c]">.</span></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-4">

        {/* Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
             <h2 className="text-[#005a78] text-lg font-semibold">Details:</h2>
             <div className="bg-slate-100 p-1 rounded"><Pencil className="h-4 w-4 text-slate-500" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
            <div>
               <p className="text-xs text-slate-400 font-medium mb-1">Customer ID</p>
               <p className="text-slate-800 border-b border-dotted border-slate-300 pb-1">{lead.entityId || lead.salesRecordInternalId || lead.id.substring(0,8)}</p>
            </div>
            <div>
               <p className="text-xs text-slate-400 font-medium mb-1">Company Name</p>
               <p className="text-slate-800 border-b border-dotted border-slate-300 pb-1">{lead.companyName}</p>
            </div>
            <div>
               <p className="text-xs text-slate-400 font-medium mb-1">ABN</p>
               <p className="text-slate-500 border-b border-dotted border-slate-300 pb-1">{lead.abn || '(Not available)'}</p>
            </div>
            <div>
               <p className="text-xs text-slate-400 font-medium mb-1">MailPlus Territory</p>
               <p className="text-slate-800 border-b border-dotted border-slate-300 pb-1">{lead.franchisee || '(Not assigned)'}</p>
            </div>
          </div>
        </div>

        {/* Contacts Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
             <h2 className="text-[#005a78] text-lg font-semibold">Contacts:</h2>
             <div className="bg-slate-100 p-1 rounded"><Pencil className="h-4 w-4 text-slate-500" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-md p-4 shadow-sm">
               <h3 className="text-[#005a78] font-medium mb-3">Service Contact</h3>
               <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                     <User className="h-4 w-4 text-slate-500" /> 
                     <span>{contact?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <Mail className="h-4 w-4 text-slate-500" /> 
                     <a href={`mailto:${contact?.email}`} className="underline underline-offset-2">{contact?.email || 'N/A'}</a>
                  </div>
                  <div className="flex items-center gap-3">
                     <Phone className="h-4 w-4 text-slate-500" /> 
                     <a href={`tel:${contact?.phone}`} className="underline underline-offset-2">{contact?.phone || lead.customerPhone || 'N/A'}</a>
                  </div>
               </div>
            </div>

            <div className="border border-slate-200 rounded-md p-4 shadow-sm">
               <h3 className="text-[#005a78] font-medium mb-3">Account Payable</h3>
               <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center gap-3">
                     <Mail className="h-4 w-4 text-slate-500" /> 
                     <a href={`mailto:${lead.customerServiceEmail}`} className="underline underline-offset-2">{lead.customerServiceEmail || 'N/A'}</a>
                  </div>
                  <div className="flex items-center gap-3">
                     <Phone className="h-4 w-4 text-slate-500" /> 
                     <a href={`tel:${lead.customerPhone}`} className="underline underline-offset-2">{lead.customerPhone || 'N/A'}</a>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Addresses Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-[#005a78] text-lg font-semibold mb-4">Addresses:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-md p-4 shadow-sm h-full">
               <p className="text-xs text-slate-400 font-medium mb-2">Site Address</p>
               {lead.address ? (
                 <div className="text-sm text-slate-700 leading-relaxed">
                   {lead.address.address1 && <div>{lead.address.address1}</div>}
                   <div>{lead.address.street}</div>
                   <div>{lead.address.city}, {lead.address.state} {lead.address.zip}</div>
                 </div>
               ) : (
                 <p className="text-sm text-slate-500">(None provided)</p>
               )}
            </div>
            <div className="border border-slate-200 rounded-md p-4 shadow-sm h-full">
               <p className="text-xs text-slate-400 font-medium mb-2">Billing Address</p>
               <p className="text-sm text-slate-500">(Same as Site Address)</p>
            </div>
            <div className="border border-slate-200 rounded-md p-4 shadow-sm h-full">
               <p className="text-xs text-slate-400 font-medium mb-2">Postal Address</p>
               <p className="text-sm text-slate-500">(None provided)</p>
            </div>
          </div>
        </div>

        {/* Services Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-baseline gap-2 mb-4">
             <h2 className="text-[#005a78] text-lg font-semibold">Services:</h2>
             <span className="text-slate-500 italic text-sm">(Starting on {new Date(scf.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'numeric', year: 'numeric' })})</span>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-md">
             <table className="w-full text-sm text-left">
                <thead className="bg-[#005a78] text-white">
                   <tr>
                      <th className="px-4 py-3 font-medium">Service Name</th>
                      <th className="px-4 py-3 font-medium">Frequency</th>
                      <th className="px-4 py-3 font-medium">Price (exc. GST)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
                   {scf.services.map((service, idx) => {
                      const freqStr = Array.isArray(service.frequency) 
                         ? service.frequency.join(', ') 
                         : service.frequency;
                      return (
                         <tr key={idx}>
                            <td className="px-4 py-4">{service.name}</td>
                            <td className="px-4 py-4">{freqStr}</td>
                            <td className="px-4 py-4">A${(service.rate || 0).toFixed(2)}</td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
        </div>

        {/* Terms and Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-[11px] leading-relaxed text-slate-600">
           <p className="mb-2">
             *Services are further defined at <a href="https://mailplus.com.au/terms-conditions/" className="text-blue-600 underline">https://mailplus.com.au/terms-conditions/</a>. Services are provided on terms set out at <a href="https://mailplus.com.au/terms-conditions/" className="text-blue-600 underline">https://mailplus.com.au/terms-conditions/</a>. Surcharges apply (including fuel levies) on a monthly basis in addition to the Price set out above.
           </p>
           
           <p className="mb-2">
             <strong>Notes:</strong> For Australia Post items collected and delivered to and from the Post Office, quoted price includes the first 16kg of items and excludes GST. Every additional 16kg of items incur a $3.85 charge. Additional charges apply for registered mail ($3.30 per item) and standard parcels ($2.20 per item). MailPlus parcels shipped via ShipMate are not included in these charges.
             <br/>
             By accepting this form, you hereby authorise MailPlus to share your contact information with Australia Post.
           </p>

           <div className="mb-4">
             <strong>Invoice Cycle:</strong>
             <ul className="list-disc pl-5 mt-1">
               <li>Service Invoices: Monthly</li>
               <li>Product Invoices: Weekly</li>
             </ul>
           </div>

           <p className="mb-3">
             Please note that the Services are often provided by third-party franchisees, who provide the Services.<br/>
             By using the Services, you accept and agree that the Services are provided on the terms set out at <a href="https://mailplus.com.au/terms-conditions/" className="text-blue-600 underline">https://mailplus.com.au/terms-conditions/</a>, our Privacy Policy and any other terms or conditions contained on the site <a href="https://www.mailplus.com.au" className="text-blue-600 underline">www.mailplus.com.au</a> which apply as at the date on which the Service is provided (Terms).<br/>
             By using the Services, you accept the Terms and represent that you have read and understood the Term and agree to be bound by the Terms. The Services are only offered and provided in accordance with the Terms.
           </p>

           <div className="border-l-4 border-green-500 pl-3 py-1 bg-green-50/50 italic text-green-800">
             <strong>Please note:</strong> MailPlus and its franchisees do not provide insurance over mail or parcel items. If you require insurance, you are solely responsible for arranging and funding this independently.
           </div>
        </div>

        {/* Actions */}
        {hasAccepted ? (
           <div className="bg-green-50 text-green-800 rounded-lg shadow-sm border border-green-200 p-6 flex items-center justify-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                 <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <div>
                 <h3 className="font-bold text-lg">Terms & Conditions Accepted</h3>
                 <p className="text-sm">Thank you. Your Service Commencement Form has been successfully confirmed.</p>
              </div>
           </div>
        ) : (
           <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
             <div className="flex items-center gap-3 justify-center mb-6">
                <Checkbox 
                  id="agree" 
                  checked={agreed} 
                  onCheckedChange={(val) => setAgreed(val as boolean)}
                  className="w-5 h-5"
                />
                <label htmlFor="agree" className="text-base text-slate-800 cursor-pointer select-none">
                  I have reviewed and confirmed my information
                </label>
             </div>
             
             <Button 
               onClick={handleAccept} 
               disabled={!agreed || submitting}
               className="w-full bg-[#8ba4a7] hover:bg-[#6c878a] text-white font-medium text-lg h-14"
             >
               {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'ACCEPT TERMS & CONDITIONS'}
             </Button>
           </div>
        )}

      </div>
    </div>
  );
}
