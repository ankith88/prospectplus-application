'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Lead } from '@/lib/types';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';

interface ProductQuoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  products: any[];
  surchargeRates: { express: number; premium: number } | null;
}

export function ProductQuoteDialog({
  isOpen,
  onClose,
  lead,
  products,
  surchargeRates,
}: ProductQuoteDialogProps) {
  const { user, userProfile } = useAuth();
  const [senderEmail, setSenderEmail] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const groupedUsers = useMemo(() => {
    let filtered = allUsers.filter(u => u.email && !u.disabled);

    const loggedInRoles = userProfile?.assignedRoles || (userProfile?.activeRole ? [userProfile.activeRole] : []);
    const hasRole = (roleNames: string[]) => {
      return loggedInRoles.some(r => roleNames.map(rn => rn.toLowerCase().trim()).includes(r?.toLowerCase().trim()));
    };

    const isAccountManagerUser = hasRole(['Account Manager', 'Account Managers', 'account managers']);
    const isDialerUser = hasRole(['user', 'Dialer', 'dialers']);

    const userHasRole = (u: any, roleNames: string[]) => {
      const normalizedNames = roleNames.map(name => name.toLowerCase().trim());
      const rolesToCheck = [
        ...(u.assignedRoles || []),
        u.activeRole,
        u.defaultRole,
        u.role
      ].filter(Boolean).map((r: string) => r.toLowerCase().trim());
      return rolesToCheck.some(r => normalizedNames.includes(r));
    };

    if (isAccountManagerUser) {
      filtered = filtered.filter(u => userHasRole(u, ['Account Manager', 'Account Managers', 'account managers', 'Sales Manager']));
    } else if (isDialerUser) {
      filtered = filtered.filter(u => userHasRole(u, ['user', 'Dialer', 'dialers', 'Account Manager', 'Account Managers', 'account managers', 'Sales Manager']));
    }

    const getGroupRoleName = (u: any): string => {
      const primaryRole = u.activeRole || u.defaultRole || u.role || (u.assignedRoles && u.assignedRoles[0]) || 'Other';
      const lower = primaryRole.toLowerCase().trim();
      if (lower === 'admin') return 'Admin';
      if (lower === 'user' || lower === 'dialer' || lower === 'dialers') return 'Dialer';
      if (lower === 'field sales' || lower === 'field sales admin' || lower === 'dashback') return 'Field Sales';
      if (lower === 'lead gen' || lower === 'lead gen admin') return 'Lead Gen';
      if (lower === 'account manager' || lower === 'account managers') return 'Account Manager';
      if (lower === 'customer success' || lower === 'customer service') return 'Customer Success/Service';
      if (lower === 'super user') return 'Super User';
      if (lower === 'sales manager') return 'Sales Manager';
      if (lower === 'franchisee') return 'Franchisee';
      if (lower.startsWith('finance')) return 'Finance';
      if (lower === 'operations') return 'Operations';
      return primaryRole.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const groups: Record<string, any[]> = {};
    filtered.forEach(u => {
      const groupName = getGroupRoleName(u);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(u);
    });

    Object.keys(groups).forEach(groupName => {
      groups[groupName].sort((a, b) => {
        const nameA = (a.displayName || a.email || '').toLowerCase();
        const nameB = (b.displayName || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });

    const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return sortedGroupNames.map(name => ({
      name,
      users: groups[name]
    }));
  }, [allUsers, userProfile]);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  // Email Selections
  const [selectedTo, setSelectedTo] = useState<string[]>([]);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');

  const { toast } = useToast();

  const availableEmails = useMemo(() => {
    const emails: { email: string; label: string; name?: string }[] = [];
    if (lead.customerServiceEmail) {
      emails.push({ email: lead.customerServiceEmail, label: 'Company Email', name: lead.companyName || 'Company' });
    }
    if (lead.contacts) {
      lead.contacts.forEach((contact, idx) => {
        if (contact.email) {
          emails.push({
            email: contact.email,
            label: `Contact: ${contact.name || 'Unnamed'}`,
            name: contact.name,
          });
        }
      });
    }
    return emails;
  }, [lead]);

  useEffect(() => {
    async function fetchUsersAndTemplate() {
      try {
        const snap = await getDocs(collection(firestore, 'users'));
        const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
        setAllUsers(list);

        const amName = lead.accountManagerAssigned;
        const amUser = list.find(u => u.displayName?.toLowerCase().trim() === amName?.toLowerCase().trim());
        const defaultSender = amUser?.email || user?.email || '';
        setSenderEmail(defaultSender);

        await fetchTemplate(list, defaultSender);
      } catch (error) {
        console.error('Error in fetchUsersAndTemplate:', error);
      }
    }
    if (isOpen) {
      setSelectedTo(availableEmails.length > 0 ? [availableEmails[0].email] : []);
      fetchUsersAndTemplate();
    }
  }, [isOpen, availableEmails, lead, user]);

  const getSurchargeRate = (speed: string) => {
    if (!surchargeRates || !speed) return 0;
    const lowerSpeed = speed.toLowerCase();
    if (lowerSpeed === 'premium') return surchargeRates.premium;
    if (lowerSpeed === 'express') return surchargeRates.express;
    return 0;
  };

  const getProductValue = (weightKey: string, type: 'base' | 'surcharge') => {
    const num = parseInt(weightKey, 10);
    const p = products.find(prod => {
      if (!prod.productWeight) return false;
      const pw = prod.productWeight.toLowerCase();
      return new RegExp(`(^|\\b|\\D)${num}\\s*kg`, 'i').test(pw);
    });
    
    if (!p) return 'N/A';
    
    const basePrice = Number(p.salesPriceIncGst || Number(p.salesPriceExcGst || 0) * 1.1);
    if (type === 'base') return basePrice.toFixed(2);
    
    const surchargePerc = getSurchargeRate(p.deliverySpeed);
    const surchargeAmt = basePrice * (surchargePerc / 100);
    return surchargeAmt.toFixed(2);
  };

  const generateProductsTableHTML = () => {
    if (!products || products.length === 0) return '<p>No products selected.</p>';
    
    let html = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; border-bottom: 1px solid #e5e7eb;">
        <thead>
          <tr style="background-color: #f7f6f4; text-align: left; border-bottom: 1px solid #e5e7eb; color: #4b5563;">
            <th style="padding: 12px 10px; font-weight: 500;">Product</th>
            <th style="padding: 12px 10px; font-weight: 500;">Weight</th>
            <th style="padding: 12px 10px; text-align: right; font-weight: 500;">Base Price (Inc. GST)</th>
            <th style="padding: 12px 10px; text-align: right; font-weight: 500;">Total (Inc. Fuel Surcharge & GST)</th>
          </tr>
        </thead>
        <tbody>
    `;

    const sortedProducts = [...products].sort((a, b) => {
      const parseWeight = (p: any) => {
        const weightStr = String(p.productWeight || p.weightRange || p.weight || '');
        const match = weightStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
        return match ? parseFloat(match[1]) : 999;
      };
      return parseWeight(a) - parseWeight(b);
    });

    sortedProducts.forEach((p) => {
      const basePrice = Number(p.salesPriceIncGst || Number(p.salesPriceExcGst || 0) * 1.1);
      const surchargePerc = getSurchargeRate(p.deliverySpeed);
      const surchargeAmt = basePrice * (surchargePerc / 100);
      const total = basePrice + surchargeAmt;
      
      html += `
        <tr style="border-bottom: 1px solid #e5e7eb; color: #1f2937;">
          <td style="padding: 12px 10px; vertical-align: middle;">${p.name || p.id}</td>
          <td style="padding: 12px 10px; vertical-align: middle;">${p.productWeight || '-'}</td>
          <td style="padding: 12px 10px; text-align: right; vertical-align: middle;">$${basePrice.toFixed(2)}</td>
          <td style="padding: 12px 10px; text-align: right; vertical-align: middle; font-weight: bold;">$${total.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
    return html;
  };

  const fetchTemplate = async (usersList: any[] = [], defaultSender: string = '') => {
    setIsLoadingTemplate(true);
    try {
      const q = query(collection(firestore, 'marketing_templates'));
      const snap = await getDocs(q);
      
      let rawSubject = 'Your Premium Quote from MailPlus';
      let rawBody = `
        <p>Hi {{FirstName}},</p>
        <p>Thank you for your interest in MailPlus Premium services. Please find your custom quote below:</p>
        {{ProductsTable}}
        <p>Let us know if you have any questions or would like to proceed.</p>
        <p>Best regards,<br>The MailPlus Team</p>
      `;

      if (!snap.empty) {
        // Find template case-insensitively, ignoring extra whitespace
        const targetName = 'send quote - premium';
        const docMatch = snap.docs.find(d => {
            const data = d.data();
            return data.name && data.name.trim().toLowerCase() === targetName;
        });

        if (docMatch) {
            const templateData = docMatch.data();
            if (templateData.subject) rawSubject = templateData.subject;
            if (templateData.body) rawBody = templateData.body;
        }
      }

      // Replace variables
      const firstName = lead.contacts?.[0]?.name?.split(' ')[0] || lead.companyName || 'Valued Customer';
      const productsTableHTML = generateProductsTableHTML();

      const currentSenderEmail = defaultSender || senderEmail;
      const senderUser = usersList.find(u => u.email?.toLowerCase().trim() === currentSenderEmail?.toLowerCase().trim());
      const senderNameVal = senderUser?.displayName || (currentSenderEmail ? currentSenderEmail.split('@')[0] : 'Account Manager');
      const senderPhoneVal = senderUser?.phoneNumber || senderUser?.mobile || '';
      const senderSignatureVal = `
        <p style="margin-top: 20px;">Kind regards,<br/>
        <strong>${senderNameVal}</strong><br/>
        MailPlus<br/>
        ${senderPhoneVal ? `Phone: ${senderPhoneVal}<br/>` : ''}Email: <a href="mailto:${currentSenderEmail}">${currentSenderEmail}</a></p>
      `;

      const thermoguardLinkVal = `
        <p>Also please see link to thermoguard as promised:<br/>
        Thermo guard cool‑chain packaging<br/>
        <a href="https://www.thermogard.com/" target="_blank" rel="noopener noreferrer">https://www.thermogard.com/</a></p>
      `;

      let finalBody = rawBody
        .replace(/\{\{Contact\.Name\}\}/gi, firstName)
        .replace(/\{\{FirstName\}\}/gi, firstName)
        .replace(/\{\{Company\.Name\}\}/gi, lead.companyName || 'Your Company')
        .replace(/\{\{Sender\.Signature\}\}/gi, senderSignatureVal)
        .replace(/\{\{Thermoguard\.Link\}\}/gi, thermoguardLinkVal)
        .replace(/\{\{prm_1kg\}\}/gi, getProductValue('1kg', 'base'))
        .replace(/\{\{fsc_1kg\}\}/gi, getProductValue('1kg', 'surcharge'))
        .replace(/\{\{prm_3kg\}\}/gi, getProductValue('3kg', 'base'))
        .replace(/\{\{fsc_3kg\}\}/gi, getProductValue('3kg', 'surcharge'))
        .replace(/\{\{prm_5kg\}\}/gi, getProductValue('5kg', 'base'))
        .replace(/\{\{fsc_5kg\}\}/gi, getProductValue('5kg', 'surcharge'))
        .replace(/\{\{prm_10kg\}\}/gi, getProductValue('10kg', 'base'))
        .replace(/\{\{fsc_10kg\}\}/gi, getProductValue('10kg', 'surcharge'))
        .replace(/\{\{prm_20kg\}\}/gi, getProductValue('20kg', 'base'))
        .replace(/\{\{fsc_20kg\}\}/gi, getProductValue('20kg', 'surcharge'))
        .replace(/\{\{ProductsTable\}\}/gi, productsTableHTML)
        .replace(/\{\{Products\}\}/gi, productsTableHTML);

      const hasCustomTable = /\{\{prm_1kg\}\}/i.test(rawBody) || /\{\{prm_3kg\}\}/i.test(rawBody);

      if (!/\{\{ProductsTable\}\}/i.test(rawBody) && !/\{\{Products\}\}/i.test(rawBody) && !hasCustomTable) {
        finalBody += `<br/>${productsTableHTML}`;
      }

      setSubject(rawSubject.replace(/\{\{Company\.Name\}\}/gi, lead.companyName || ''));
      setMessage(finalBody);
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load quote template.' });
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSend = async () => {
    if (selectedTo.length === 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select at least one recipient.' });
      return;
    }
    if (!subject.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Subject cannot be empty.' });
      return;
    }
    if (!message.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Message cannot be empty.' });
      return;
    }

    setIsSending(true);
    try {
      const toEmails = selectedTo.join(',');

      const response = await fetch('/api/campaigns/send-custom-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmails,
          cc,
          bcc,
          subject,
          html: message,
          customFrom: senderEmail
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: 'Quote Sent', description: 'Your quote has been dispatched successfully.' });
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'Send Failed', description: result.message || 'Failed to send quote.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred while sending the quote.' });
    } finally {
      setIsSending(false);
    }
  };

  const toggleToEmail = (email: string) => {
    setSelectedTo((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Send Product Quote</DialogTitle>
          <DialogDescription>
            Review and edit the quote before sending it to the prospect.
          </DialogDescription>
        </DialogHeader>

        {isLoadingTemplate ? (
          <div className="flex-1 flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-2">
            
            {/* From Selection */}
            <div className="space-y-2">
              <Label>From</Label>
               <Select 
                 value={senderEmail} 
                 onValueChange={(val) => setSenderEmail(val)}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select Sender Email" />
                 </SelectTrigger>
                 <SelectContent>
                   {groupedUsers.map(group => (
                     <SelectGroup key={group.name}>
                       <SelectLabel>{group.name}</SelectLabel>
                       {group.users.map(u => (
                         <SelectItem key={u.uid || u.email} value={u.email}>
                           {u.displayName || u.email} ({u.email})
                         </SelectItem>
                       ))}
                     </SelectGroup>
                   ))}
                   {groupedUsers.length === 0 && user?.email && (
                     <SelectItem value={user.email}>
                       {user.displayName || user.email} ({user.email})
                     </SelectItem>
                   )}
                 </SelectContent>
               </Select>
            </div>

            {/* To Selection */}
            <div className="space-y-2">
              <Label>To</Label>
              {availableEmails.length === 0 ? (
                <div className="text-sm text-destructive">No email addresses found for this lead.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {availableEmails.map((item) => (
                    <div key={item.email} className="flex items-center space-x-2">
                      <Checkbox
                        id={`to-${item.email}`}
                        checked={selectedTo.includes(item.email)}
                        onCheckedChange={() => toggleToEmail(item.email)}
                      />
                      <label
                        htmlFor={`to-${item.email}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item.label} ({item.email})
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CC and BCC */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  placeholder="Comma separated emails"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bcc">BCC</Label>
                <Input
                  id="bcc"
                  placeholder="Comma separated emails"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Quote Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2 flex flex-col min-h-[300px]">
              <div className="flex justify-between items-center">
                <Label htmlFor="message">Message</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs" 
                    onClick={() => {
                      const thermoguardLinkVal = `
                        <p>Also please see link to thermoguard as promised:<br/>
                        Thermo guard cool‑chain packaging<br/>
                        <a href="https://www.thermogard.com/" target="_blank" rel="noopener noreferrer">https://www.thermogard.com/</a></p>
                      `;
                      setMessage(prev => prev + thermoguardLinkVal);
                    }}
                  >
                    + Thermoguard Link
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs" 
                    onClick={() => {
                      const senderUser = allUsers.find(u => u.email?.toLowerCase().trim() === senderEmail?.toLowerCase().trim());
                      const senderNameVal = senderUser?.displayName || (senderEmail ? senderEmail.split('@')[0] : 'Account Manager');
                      const senderPhoneVal = senderUser?.phoneNumber || senderUser?.mobile || '';
                      const senderSignatureVal = `
                        <p style="margin-top: 20px;">Kind regards,<br/>
                        <strong>${senderNameVal}</strong><br/>
                        MailPlus<br/>
                        ${senderPhoneVal ? `Phone: ${senderPhoneVal}<br/>` : ''}Email: <a href="mailto:${senderEmail}">${senderEmail}</a></p>
                      `;
                      setMessage(prev => prev + senderSignatureVal);
                    }}
                  >
                    + Sender Signature
                  </Button>
                </div>
              </div>
              <div className="flex-1 border rounded-md overflow-hidden bg-white mt-1">
                 <RichTextEditor 
                    value={message} 
                    onChange={setMessage} 
                    className="h-full border-none shadow-none"
                  />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || selectedTo.length === 0 || isLoadingTemplate}
            className="gap-2"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
