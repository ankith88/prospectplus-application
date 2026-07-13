'use client';

import { useState, useEffect, useMemo } from 'react';
import { VisualIframeEditor } from './ui/visual-iframe-editor';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Inbox, Info, Edit, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import { updateLeadServices, updateLeadStatus, updateContactSendEmail, logActivity, getServices, createScfRecord, getFranchiseeByName, updateLeadCommReg, updateLeadDetails } from '@/services/firebase';
import { initiateServicesTrial, submitServiceQuote } from '@/services/netsuite-services-proxy';
import { initiateSignup } from '@/services/netsuite-signup-proxy';
import { useAuth } from '@/hooks/use-auth';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, UserPlus, Package } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format, differenceInDays, isWeekend, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { Lead, Contact, Franchisee } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { AddContactForm } from './add-contact-form';
import { EditPostalAddressDialog } from './edit-postal-address-dialog';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { generatePricingTable, generateSuburbMapping } from '@/lib/pricing-helpers';

interface Template {
  id: string;
  name: string;
  subject?: string;
  body?: string;
  htmlContent?: string;
  content?: string;
}

const getSuffixedName = (baseName: string, currentSelections: string[]) => {
  let count = 0;
  for (const s of currentSelections) {
     if (s === baseName || s.startsWith(baseName + ' ')) {
        // Only count exact matches or matches that end with a space and a number
        const suffix = s.substring(baseName.length).trim();
        if (suffix === '' || !isNaN(Number(suffix))) {
            count++;
        }
     }
  }
  return count === 0 ? baseName : `${baseName} ${count + 1}`;
};

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const VALID_ACCOUNT_MANAGERS = ["Lee Russell", "Kerina Helliwell", "Luke F", "Account Manager"];

const formSchema = z.object({
  selectedServices: z.array(z.string()),
  frequencies: z.record(z.union([z.array(z.string()), z.literal('Adhoc')])),
  trialDateRange: z.custom<DateRange>().optional(),
  startDate: z.date().optional(),
  selectedContactId: z.string().optional(),
  selectedContactIds: z.array(z.string()).optional(),
  rates: z.record(z.coerce.number().min(0)).optional(),
  createLocalMileSchedules: z.record(z.boolean()).optional(),
  createLocalMileAccount: z.boolean().optional(),
  createShipMateAccount: z.boolean().optional(),
  chosenPremiumPlan: z.string().default('Merchant'),
  chosenExpressPlan: z.string().default('Merchant'),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  mode: 'Free Trial' | 'Signup' | 'Quote';
  onSuccess?: () => void;
}

export function ServiceSelectionDialog({
  isOpen,
  onOpenChange,
  lead,
  mode,
  onSuccess,
}: ServiceSelectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isPostalAddressDialogOpen, setIsPostalAddressDialogOpen] = useState(false);
  const [localLead, setLocalLead] = useState<Lead | null>(lead);
  
  const [selectionType, setSelectionType] = useState<'services' | 'products' | 'both' | null>(null);

  useEffect(() => {
    if (mode === 'Free Trial') {
      setSelectionType('services');
    } else {
      setSelectionType(null);
    }
  }, [mode, isOpen]);

  useEffect(() => {
    setLocalLead(lead);
  }, [lead]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableServices, setAvailableServices] = useState<{internalId: number|string, label: string}[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState({ 
    to: '', 
    cc: '', 
    bcc: '', 
    subject: '', 
    html: '', 
    scfId: '',
    primaryColor: '#095C7B',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    logoUrl: '',
    senderEmail: ''
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [franchiseeEmail, setFranchiseeEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

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
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pricePlan, setPricePlan] = useState('Premium Merchant');
  const [availablePricePlans, setAvailablePricePlans] = useState<string[]>(['Premium Merchant', 'Standard', 'Enterprise']);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [surchargeRates, setSurchargeRates] = useState<{express: number, premium: number} | null>(null);

  const [franchisee, setFranchisee] = useState<Franchisee | null>(null);
  const [isPremiumEligible, setIsPremiumEligible] = useState<boolean>(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedServices: [],
      frequencies: {},
      rates: {},
      createLocalMileSchedules: {},
      createLocalMileAccount: false,
      createShipMateAccount: false,
      chosenPremiumPlan: 'Merchant',
      chosenExpressPlan: 'Merchant',
    },
  });

  useEffect(() => {
    if (lead) {
      setContacts(lead.contacts || []);
      if (lead.franchisee && lead.franchisee !== 'Unassigned') {
        getFranchiseeByName(lead.franchisee).then(f => {
          if (f) {
            setFranchisee(f);
            if (f.email) setFranchiseeEmail(f.email);
            // Check premium eligibility (suburb matching in franchisee's starTrackSuburbsJson)
            const eligible = f.starTrackSuburbsJson?.some(mapping => 
              mapping.suburbs?.toUpperCase() === lead.address?.city?.toUpperCase() &&
              mapping.state?.toUpperCase() === lead.address?.state?.toUpperCase() &&
              mapping.post_code === lead.address?.zip
            ) || false;
            setIsPremiumEligible(eligible);
          }
        });
      } else {
        setFranchisee(null);
        setIsPremiumEligible(false);
      }
    }
  }, [lead]);

  useEffect(() => {
    getServices().then((services) => {
      const formattedServices = services.map(s => ({
        internalId: s.id,
        label: s.code || s.name || s.id
      })).sort((a,b) => a.label.localeCompare(b.label));
      setAvailableServices(formattedServices);
    });
  }, []);

  useEffect(() => {
    if ((mode === 'Quote' || mode === 'Signup') && isOpen) {
      const fetchSurcharge = async () => {
        try {
          const res = await fetch('/api/surcharge');
          const data = await res.json();
          if (data && !data.error) {
            setSurchargeRates(data);
          }
        } catch (error) {
          console.error("Error fetching surcharge rates:", error);
        }
      };
      fetchSurcharge();

      const fetchProducts = async () => {
        setProductsLoading(true);
        try {
          const q = query(
            collection(firestore, 'products'),
            where('deliverySpeed', '==', 'Premium'),
            where('isActive', '==', true)
          );
          const EXCLUDED_PRODUCTS = [
            "MailPlus Premium - Small Merchant 1kg (D: REM)",
            "MailPlus Premium - Medium Merchant 3kg (D: REM)",
            "MailPlus Premium - Large Merchant 5kg (D: REM)"
          ];
          const fetchedProducts = snapshot.docs
            .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
            .filter(p => !EXCLUDED_PRODUCTS.includes(p.name));
          
          const plans = new Set<string>();
          fetchedProducts.forEach(p => {
              if (p.pricePlan) plans.add(p.pricePlan);
          });
          if (plans.size > 0) {
              setAvailablePricePlans(Array.from(plans));
              if (!plans.has('Premium Merchant')) {
                  setAvailablePricePlans(prev => ['Premium Merchant', ...prev]);
              }
          }
          
          setProducts(fetchedProducts);
          const defaultPlanProds = fetchedProducts.filter(p => p.pricePlan === 'Premium Merchant');
          setSelectedProducts(defaultPlanProds.map(p => p.id));
        } catch (error) {
          console.error("Error fetching products:", error);
        } finally {
          setProductsLoading(false);
        }
      };
      fetchProducts();
    }
  }, [mode, isOpen]);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const snap = await getDocs(collection(firestore, 'marketing_templates'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template));
        setTemplates(list);
      } catch (error) {
        console.error('Error fetching templates', error);
      }
    }
    async function fetchUsers() {
      try {
        const snap = await getDocs(collection(firestore, 'users'));
        const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
        setAllUsers(list);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    }
    if (isOpen) {
      fetchTemplates();
      fetchUsers();
      setSelectedTemplate('custom');
      let initialSelectedServices: string[] = [];
      let initialFrequencies: Record<string, any> = {};
      let initialRates: Record<string, any> = {};
      let startDate = undefined;

      if (lead?.services && lead.services.length > 0) {
        initialSelectedServices = lead.services.map(s => s.name);
        initialFrequencies = lead.services.reduce((acc, s) => ({ ...acc, [s.name]: s.frequency }), {});
        initialRates = lead.services.reduce((acc, s) => ({ ...acc, [s.name]: s.rate }), {});
        if (lead.services[0]?.startDate) {
            startDate = new Date(lead.services[0].startDate);
        }
      }

      const hasLocalMile = lead?.localMileTrialsRemaining !== undefined || lead?.contacts?.some(c => c.accessToLocalMile === 'yes');
      if (mode === 'Signup' && hasLocalMile) {
         if (!initialSelectedServices.includes('PMPO')) {
             initialSelectedServices.push('PMPO');
             initialFrequencies['PMPO'] = lead?.serviceType === 'Recurring' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : 'Adhoc';
             initialRates['PMPO'] = lead?.rate ?? 15;
         }
      }

      const defaultContact = lead?.contacts?.find(c => c.isPrimary) || (lead?.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null);
      const defaultContactId = defaultContact ? defaultContact.id : undefined;

      form.reset({
          selectedServices: initialSelectedServices,
          frequencies: initialFrequencies,
          rates: initialRates,
          startDate: startDate,
          createLocalMileAccount: false,
          createShipMateAccount: false,
          selectedContactId: defaultContactId,
          selectedContactIds: defaultContactId ? [defaultContactId] : [],
      });
    } else {
        setIsAddingContact(false);
        setIsPostalAddressDialogOpen(false);
        setShowEmailPreview(false);
        setEmailPreviewData({ 
            to: '', 
            cc: '', 
            bcc: '', 
            subject: '', 
            html: '', 
            scfId: '',
            primaryColor: '#095C7B',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            logoUrl: '',
            senderEmail: ''
        });
    }
  }, [isOpen, form, lead]);

  const generateServiceTableHtml = () => {
    const values = form.getValues();
    const selectedServices = values.selectedServices || [];
    if (selectedServices.length === 0) return '<p>No services selected.</p>';
    
    let html = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #ced4da;">
        <thead>
          <tr style="background-color: #f1f3f5; text-align: left;">
            <th style="padding: 8px; border: 1px solid #ced4da; font-weight: bold;">Service</th>
            <th style="padding: 8px; border: 1px solid #ced4da; font-weight: bold;">Frequency</th>
            <th style="padding: 8px; border: 1px solid #ced4da; font-weight: bold; text-align: right;">Rate</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    selectedServices.forEach(s => {
      const rawFreq = values.frequencies?.[s];
      const freqDisplay = Array.isArray(rawFreq) ? rawFreq.join(', ') : (rawFreq || '');
      const rate = Number(values.rates?.[s] || 0).toFixed(2);
      html += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ced4da;">${s}</td>
          <td style="padding: 8px; border: 1px solid #ced4da;">${freqDisplay}</td>
          <td style="padding: 8px; border: 1px solid #ced4da; text-align: right;">$${rate}</td>
        </tr>
      `;
    });
    
    html += `</tbody></table>`;
    return html;
  };

  const generateProductTableHtml = () => {
    if (selectedProducts.length === 0) return '<p>No products selected.</p>';
    
    let html = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; border-bottom: 1px solid #e5e7eb;">
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
    
    const sortedSelected = [...products.filter(p => selectedProducts.includes(p.id))].sort((a, b) => {
      const parseWeight = (p: any) => {
        const weightStr = String(p.productWeight || p.weightRange || p.weight || '');
        const match = weightStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
        return match ? parseFloat(match[1]) : 999;
      };
      return parseWeight(a) - parseWeight(b);
    });

    sortedSelected.forEach(p => {
      const basePrice = Number(p.salesPriceIncGst || Number(p.salesPriceExcGst || 0) * 1.1);
      const surchargePerc = surchargeRates ? (p.deliverySpeed?.toLowerCase() === 'premium' ? surchargeRates.premium : (p.deliverySpeed?.toLowerCase() === 'express' ? surchargeRates.express : 0)) : 12.5;
      const surchargeAmt = basePrice * (surchargePerc / 100);
      const totalVal = basePrice + surchargeAmt;
      
      html += `
        <tr style="border-bottom: 1px solid #e5e7eb; color: #1f2937;">
          <td style="padding: 12px 10px; vertical-align: middle;">${p.name || p.id}</td>
          <td style="padding: 12px 10px; vertical-align: middle;">${p.productWeight || p.weightRange || p.weight || '-'}</td>
          <td style="padding: 12px 10px; text-align: right; vertical-align: middle;">$${basePrice.toFixed(2)}</td>
          <td style="padding: 12px 10px; text-align: right; vertical-align: middle; font-weight: bold;">$${totalVal.toFixed(2)}</td>
        </tr>
      `;
    });
    
    html += `</tbody></table>`;
    return html;
  };

  const resolvePlaceholders = (text: string) => {
    if (!lead || !text) return text;
    const selectedContactIds = form.getValues('selectedContactIds') || [];
    const primaryContact = contacts.find(c => selectedContactIds.includes(c.id)) || contacts.find(c => c.id === form.getValues('selectedContactId')) || (contacts.length > 0 ? contacts[0] : null);
    const contactName = primaryContact?.name || 'Customer';
    const firstName = contactName.split(' ')[0];
    const salesRepName = lead.accountManagerAssigned || user?.displayName || 'Account Manager';
    const scfUrl = emailPreviewData.scfId ? `${window.location.origin}/scf/${emailPreviewData.scfId}` : '';

    let resolved = text;
    resolved = resolved.replace(/\{\{Contact\.Name\}\}/gi, contactName);
    resolved = resolved.replace(/\{\{Contact\.FirstName\}\}/gi, firstName);
    resolved = resolved.replace(/\{\{contact_first_name\}\}/gi, firstName);
    resolved = resolved.replace(/\{\{Company\.Name\}\}/gi, lead.companyName || '');
    resolved = resolved.replace(/\{\{company_name\}\}/gi, lead.companyName || '');
    resolved = resolved.replace(/\{\{SalesRep\.Name\}\}/gi, salesRepName);
    resolved = resolved.replace(/\{\{sales_rep_name\}\}/gi, salesRepName);
    resolved = resolved.replace(/\{\{Franchisee\.Name\}\}/gi, lead.franchisee || 'MailPlus');
    resolved = resolved.replace(/\{\{franchisee_name\}\}/gi, lead.franchisee || 'MailPlus');
    resolved = resolved.replace(/\{\{AccountManager\.Name\}\}/gi, lead.accountManagerAssigned || salesRepName);
    resolved = resolved.replace(/\{\{AccountManager\.Mobile\}\}/gi, (user as any)?.mobile || '');
    resolved = resolved.replace(/\{\{AccountManager\.Calendly\}\}/gi, (user as any)?.calendly || '');
    resolved = resolved.replace(/\{\{Lead\.ContactBookingLink\}\}/gi, lead.bookingUrlId ? `${window.location.origin}/book/${lead.bookingUrlId}` : '');
    resolved = resolved.replace(/\{\{Lead\.GeneralBookingLink\}\}/gi, lead.generalBookingUrlId ? `${window.location.origin}/book/${lead.generalBookingUrlId}` : '');
    resolved = resolved.replace(/\{\{Lead\.City\}\}/gi, lead.postalAddress?.city || lead.address?.city || '');
    resolved = resolved.replace(/\{\{Trials\.Remaining\}\}/gi, String(lead.localMileTrialsRemaining ?? 0));
    resolved = resolved.replace(/\{\{Lead\.SCFLink\}\}/gi, scfUrl);
    resolved = resolved.replace(/\{\{scf_link\}\}/gi, scfUrl);
    resolved = resolved.replace(/\{\{scf_url\}\}/gi, scfUrl);
    resolved = resolved.replace(/\{\{acceptUrl\}\}/gi, scfUrl);
    resolved = resolved.replace(/\{\{unsubscribe_link\}\}/gi, '#');
    resolved = resolved.replace(/\{\{unsubscribe_url\}\}/gi, '#');
    resolved = resolved.replace(/\{\{Prospect\.ProspectPlusID\}\}/gi, lead.prospectPlusId || '');
    resolved = resolved.replace(/\{\{prospect_plus_id\}\}/gi, lead.prospectPlusId || '');

    const currentSenderEmail = emailPreviewData.senderEmail;
    const senderUser = allUsers.find(u => u.email?.toLowerCase().trim() === currentSenderEmail?.toLowerCase().trim());
    const senderNameVal = senderUser?.displayName || (currentSenderEmail ? currentSenderEmail.split('@')[0] : 'Account Manager');
    const senderPhoneVal = senderUser?.phoneNumber || senderUser?.mobile || '';
    const senderSignatureVal = `
      <p style="margin-top: 20px;">Kind regards,<br/>
      <strong>${senderNameVal}</strong><br/>
      MailPlus<br/>
      ${senderPhoneVal ? `Phone: ${senderPhoneVal}<br/>` : ''}Email: <a href="mailto:${currentSenderEmail}">${currentSenderEmail}</a></p>
    `;
    resolved = resolved.replace(/\{\{Sender\.Signature\}\}/gi, senderSignatureVal);

    const thermoguardLinkVal = `
      <p>Also please see link to thermoguard as promised:<br/>
      Thermo guard cool‑chain packaging<br/>
      <a href="https://www.thermogard.com/" target="_blank" rel="noopener noreferrer">https://www.thermogard.com/</a></p>
    `;
    resolved = resolved.replace(/\{\{Thermoguard\.Link\}\}/gi, thermoguardLinkVal);

    if (resolved.includes('{{service_details_html}}') || resolved.includes('{{serviceDetailsHtml}}')) {
      const tableHtml = generateServiceTableHtml();
      resolved = resolved.replace(/\{\{service_details_html\}\}/gi, tableHtml);
      resolved = resolved.replace(/\{\{serviceDetailsHtml\}\}/gi, tableHtml);
    }
    if (resolved.includes('{{products_details_html}}') || resolved.includes('{{products_table}}') || resolved.includes('{{products_section_html}}')) {
      const prodTableHtml = generateProductTableHtml();
      resolved = resolved.replace(/\{\{products_details_html\}\}/gi, prodTableHtml);
      resolved = resolved.replace(/\{\{products_table\}\}/gi, prodTableHtml);
      resolved = resolved.replace(/\{\{products_section_html\}\}/gi, prodTableHtml);
    }

    return resolved;
  };

  const insertContent = (htmlContent: string) => {
    if ((window as any).__iframeEditorInsert) {
      (window as any).__iframeEditorInsert(htmlContent);
    }
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'custom') {
      setEmailPreviewData(prev => ({
        ...prev,
        subject: '',
        html: '<p>Hi,</p><p><br></p>'
      }));
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template && lead) {
      const parsedBody = template.body || template.htmlContent || template.content || '';
      const resolvedBody = resolvePlaceholders(parsedBody);
      const resolvedSubject = resolvePlaceholders(template.subject || '');
      
      setEmailPreviewData(prev => ({
        ...prev,
        subject: resolvedSubject || template.subject || prev.subject,
        html: resolvedBody
      }));
    }
  };

  const handleSendEmail = async () => {
    if (!lead) return;
    setIsSending(true);
    try {
      const finalHtml = resolvePlaceholders(emailPreviewData.html);
      const finalSubject = resolvePlaceholders(emailPreviewData.subject);

      if (mode === 'Quote') {
        const res = await fetch('/api/scf/send-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              leadId: lead.id,
              contactId: form.getValues('selectedContactId'),
              scfUrl: `${window.location.origin}/scf/${emailPreviewData.scfId}`,
              scfId: emailPreviewData.scfId,
              customHtml: finalHtml,
              customSubject: finalSubject,
              customTo: emailPreviewData.to,
              cc: emailPreviewData.cc,
              bcc: emailPreviewData.bcc,
              customFrom: emailPreviewData.senderEmail,
              isTemplate: selectedTemplate !== 'custom'
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
 
        await updateLeadStatus(lead.id, 'Quote Sent');
        await logActivity(lead.id, {
            type: 'Update',
            notes: `Processed sales option: Quote for services and sent email.`,
            author: user?.displayName || 'Unknown'
        });
        toast({ title: 'Success!', description: 'The quote email has been sent.' });
      } else if (mode === 'Signup') {
        const response = await fetch('/api/campaigns/send-custom-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: emailPreviewData.to,
            cc: emailPreviewData.cc,
            bcc: emailPreviewData.bcc,
            subject: finalSubject,
            html: finalHtml,
            customFrom: emailPreviewData.senderEmail,
            isTemplate: selectedTemplate !== 'custom'
          })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        await logActivity(lead.id, {
            type: 'Email',
            notes: `Sent Signup confirmation email to ${emailPreviewData.to}`,
            author: user?.displayName || 'Unknown'
        });
        toast({ title: 'Success!', description: 'The signup email has been sent.' });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      console.error("Failed to send email:", e);
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to send email.' });
    } finally {
      setIsSending(false);
    }
  };


  const selectedServices = form.watch('selectedServices');
  const selectedContactId = form.watch('selectedContactId');
  const primaryContactRender = contacts.find(c => c.id === selectedContactId) || (contacts.length > 0 ? contacts[0] : null);
  const hasLocalMileAccessRender = primaryContactRender?.accessToLocalMile === 'yes';
  const hasAmpoService = selectedServices.some(s => s.toLowerCase().includes('ampo'));

  const handleDateSelect = (
    range: DateRange | undefined,
    onChange: (...event: any[]) => void
  ) => {
    if (range?.from && range?.to) {
      if (differenceInDays(range.to, range.from) > 4) {
        toast({
          variant: 'destructive',
          title: 'Invalid Date Range',
          description: 'Free trial period cannot exceed 5 business days.',
        });
        return;
      }
    }
    onChange(range);
  };

  const handleContactAdded = (newContact: Contact) => {
    if (!lead) return;
    setContacts((prev) => [...prev, newContact]);
    form.setValue('selectedContactId', newContact.id);
    const currentIds = form.getValues('selectedContactIds') || [];
    form.setValue('selectedContactIds', [...currentIds, newContact.id]);
    setIsAddingContact(false);
  };


  const handleSubmit = async (values: FormValues) => {
    if (!lead) return;
    
    // Custom validation based on selectionType
    if (selectionType !== 'products') {
      if (!values.selectedServices || values.selectedServices.length === 0) {
        toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one service.' });
        return;
      }
      if (values.selectedServices.some(s => !values.rates?.[s])) {
        toast({ variant: 'destructive', title: 'Missing Rate', description: 'Please provide a rate for all selected services.' });
        return;
      }
    }
    
    if (selectionType !== 'services' && (mode === 'Quote' || mode === 'Signup')) {
      if (selectedProducts.length === 0) {
        toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one product.' });
        return;
      }
    }

    if (mode === 'Free Trial' && !values.trialDateRange?.from) {
      form.setError('trialDateRange', { type: 'manual', message: 'Please select a trial period.' });
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a trial period.' });
      return;
    }
    if (!values.selectedContactIds || values.selectedContactIds.length === 0) {
      form.setError('selectedContactIds', { type: 'manual', message: 'Please select at least one contact.' });
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select at least one contact to receive the quote/email.' });
      return;
    }
    
    // Fallback for fields relying on selectedContactId
    values.selectedContactId = values.selectedContactIds[0];

    if (mode === 'Signup' && !values.startDate) {
      form.setError('startDate', { type: 'manual', message: 'Please select a start date.' });
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a service start date.' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (values.selectedContactIds) {
        for (const cid of values.selectedContactIds) {
          await updateContactSendEmail(lead.id, cid);
        }
      }

      const serviceSelections = selectionType === 'products' ? [] : values.selectedServices.map(serviceName => {
        const svc: any = {
          name: serviceName as any,
          frequency: values.frequencies[serviceName] as "Adhoc" | ("Mon" | "Tue" | "Wed" | "Thu" | "Fri")[],
          rate: values.rates?.[serviceName] || 0,
        };
        if (mode === 'Free Trial') {
          if (values.trialDateRange?.from) svc.trialStartDate = values.trialDateRange.from.toISOString();
          if (values.trialDateRange?.to) svc.trialEndDate = values.trialDateRange.to.toISOString();
        }
        if ((mode === 'Signup' || mode === 'Quote') && values.startDate) {
          svc.startDate = values.startDate.toISOString();
        }
        return svc;
      });

      if (mode === 'Free Trial') {

        const trialDates = eachDayOfInterval({
          start: values.trialDateRange!.from!,
          end: values.trialDateRange!.to || values.trialDateRange!.from!,
        }).filter(d => !isWeekend(d)).map(date => format(date, 'dd/MM/yyyy'));

        const nsResponse = await initiateServicesTrial({
          leadId: lead.id,
          services: serviceSelections.map(s => ({
            service: s.name,
            frequency: s.frequency,
            rate: 0, // Default for trial
          })),
          trialPeriod: trialDates,
        });

        if (!nsResponse.success) {
          throw new Error(nsResponse.message || 'An unknown error occurred in NetSuite.');
        }
        
        await updateLeadStatus(lead.id, 'Free Trial');
      } else if (mode === 'Quote' || mode === 'Signup') {
        const premiumPlan = isPremiumEligible ? (values.chosenPremiumPlan || 'Merchant') : 'None';
        const expressPlan = values.chosenExpressPlan || 'Merchant';
        const pricingTable = generatePricingTable(premiumPlan, expressPlan);
        const suburbMapping = generateSuburbMapping(lead, franchisee);

        const collectionName = lead.status === 'Won' ? 'companies' : 'leads';
        await updateDoc(doc(firestore, collectionName, lead.id), {
          chosenPremiumPlan: premiumPlan,
          chosenExpressPlan: expressPlan,
          pricing_table: pricingTable,
          suburb_mapping: suburbMapping,
          updatedAt: new Date()
        });

        const salesRepIdMap: Record<string, string> = {
          "Lee Russell": "668711",
          "Kerina Helliwell": "696160",
          "Luke F": "653718",
          "Account Manager": "409635"
        };
        
        let selectedAm = lead.accountManagerAssigned;
        const isValidAmAssigned = VALID_ACCOUNT_MANAGERS.includes(selectedAm || '');
        
        if (!isValidAmAssigned) {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('assignedRoles', 'array-contains', 'Account Managers'));
            const snap = await getDocs(q);
            const ams = snap.docs.map(doc => ({ uid: doc.id, ...(doc.data() as object) } as any));
            
            const poolNames = ["Lee Russell", "Kerina Helliwell"];
            const pool = ams.filter(am => poolNames.includes(am.displayName || `${am.firstName || ''} ${am.lastName || ''}`.trim()));
            
            let availableAms = pool.filter(am => !(am.leaveProfile?.isOnLeave && am.leaveProfile?.stopAssignment));
            
            if (availableAms.length === 0) {
               const backups = pool.map(am => am.leaveProfile?.backupAmName).filter(Boolean);
               if (backups.length > 0) {
                   availableAms = ams.filter(am => backups.includes(am.displayName || `${am.firstName || ''} ${am.lastName || ''}`.trim()));
               }
            }
            
            if (availableAms.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableAms.length);
                const assignedUser = availableAms[randomIndex];
                selectedAm = assignedUser.displayName || `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim();
            } else {
                selectedAm = "Account Manager";
            }
            
            await updateLeadDetails(lead.id, lead, { accountManagerAssigned: selectedAm });
        }
        
        const salesRepId = selectedAm ? salesRepIdMap[selectedAm] || "" : "";
        
        const mappedServices = serviceSelections.map(s => {
          const matchingService = availableServices.find(as => as.label === s.name);
          
          let freqStr = "0,0,0,0,0,0";
          if (s.frequency === 'Adhoc') {
             freqStr = "0,0,0,0,0,1";
          } else if (Array.isArray(s.frequency)) {
             const daysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
             const boolArr = daysMap.map(d => s.frequency.includes(d) ? '1' : '0');
             freqStr = [...boolArr, '0'].join(',');
          }
          
          return {
             id: matchingService ? String(matchingService.internalId) : "",
             name: s.name,
             price: String(s.rate),
             freq: freqStr
          };
        });

        // Trigger NetSuite Sync in background ONLY if we are signing up/quoting services
        if (selectionType !== 'products') {
          submitServiceQuote({
             operation: mode === 'Quote' ? 'quoteCustomer' : 'signCustomer',
             customerId: (lead as any).internalid || lead.id,
             contactId: values.selectedContactId || "",
             salesRecordId: lead.salesRecordInternalId || "",
             salesRepId: salesRepId,
             services: mappedServices,
             commDate: values.startDate ? format(values.startDate, 'dd/MM/yyyy') : "",
          })
            .then(async (nsResponse) => {
               if (nsResponse.success && nsResponse.commRegId && nsResponse.dynamicScfUrl) {
                  await updateLeadCommReg(lead.id, nsResponse.commRegId, nsResponse.dynamicScfUrl);
                  console.log(`[NetSuite Async Sync] Successfully synced for lead ${lead.id}`);
               } else {
                  console.error(`[NetSuite Async Sync Error] Failed to sync for lead ${lead.id}:`, nsResponse.message);
                  await logActivity(lead.id, {
                     type: 'Update',
                     notes: `Background NetSuite Sync failed: ${nsResponse.message || 'Unknown error'}`,
                     author: 'System'
                  });
               }
            })
            .catch(async (err) => {
               console.error(`[NetSuite Async Sync Error] Fatal error syncing for lead ${lead.id}:`, err);
               await logActivity(lead.id, {
                  type: 'Update',
                  notes: `Background NetSuite Sync error: ${err.message || err}`,
                  author: 'System'
               });
            });
        }

        // Map selected products with precalculated fuel surcharges to save directly on SCF document
        const scfProducts = selectionType === 'services' ? [] : products.filter(p => selectedProducts.includes(p.id)).map(p => {
          const basePrice = Number(p.salesPriceIncGst || Number(p.salesPriceExcGst || 0) * 1.1);
          const speed = (p.deliverySpeed || '').toLowerCase();
          const surchargePerc = surchargeRates ? (speed === 'premium' ? surchargeRates.premium : (speed === 'express' ? surchargeRates.express : 0)) : 12.5;
          const surchargeAmt = basePrice * (surchargePerc / 100);
          const totalVal = basePrice + surchargeAmt;
          return {
            ...p,
            surchargePerc,
            surchargeAmt,
            totalVal
          };
        });

        if (mode === 'Quote') {
            const scfId = await createScfRecord(lead.id, {
                contactId: values.selectedContactIds?.join(','),
                services: serviceSelections,
                products: scfProducts,
                startDate: values.startDate ? values.startDate.toISOString() : new Date().toISOString(),
                status: 'Pending',
            });
            
            const scfUrl = `${window.location.origin}/scf/${scfId}`;
            
            try {
              const res = await fetch('/api/scf/generate-quote-preview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      leadId: lead.id,
                      contactId: values.selectedContactIds?.join(','),
                      scfUrl,
                      startDate: values.startDate ? format(values.startDate, 'MMM dd, yyyy') : '',
                      services: serviceSelections,
                      products: selectionType === 'services' ? [] : products.filter(p => selectedProducts.includes(p.id))
                  })
              });
              const data = await res.json();
              if (data.success) {
                  await updateLeadServices(lead.id, serviceSelections);
                  
                  const amUser = allUsers.find(u => u.displayName?.toLowerCase().trim() === lead.accountManagerAssigned?.toLowerCase().trim());
                  const defaultSenderEmail = amUser?.email || user?.email || '';

                  setSelectedTemplate('custom');
                  setEmailPreviewData({
                      to: data.contactEmail,
                      cc: franchiseeEmail,
                      bcc: '',
                      subject: '',
                      html: '<p>Hi,</p><p><br></p>',
                      scfId,
                      primaryColor: data.primaryColor || '#095C7B',
                      fontFamily: data.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      logoUrl: data.logoUrl || '',
                      senderEmail: defaultSenderEmail
                  });
                  setShowEmailPreview(true);
                  setIsSubmitting(false);
                  return; // Wait for user to click send email
              } else {
                  throw new Error(data.message);
              }
           } catch (e) {
             console.error("Failed to generate quote preview:", e);
             toast({ variant: 'destructive', title: 'Preview Error', description: 'Failed to generate email preview.' });
             setIsSubmitting(false);
             return;
           }
         } else if (mode === 'Signup') {
           await updateLeadStatus(lead.id, 'Won');
           await updateLeadServices(lead.id, serviceSelections);

           if (values.createLocalMileAccount || values.createShipMateAccount) {
             if (values.createLocalMileAccount) {
               await updateLeadDetails(lead.id, lead, { localMileTrialsRemaining: 0 });
             }
             try {
               await initiateSignup({
                 leadId: lead.id,
                 services: [],
                 startDate: values.startDate ? format(values.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                 localmileAccess: values.createLocalMileAccount || undefined,
                 shipmateAccess: values.createShipMateAccount || undefined
               });
             } catch (nsErr) {
               console.error("Failed to initiate NetSuite signup for products:", nsErr);
             }
           }
           
            const selectedContacts = contacts.filter(c => values.selectedContactIds?.includes(c.id));
            const contactEmails = selectedContacts.map(c => c.email).filter(Boolean);
            const signupEmailsString = contactEmails.length > 0 ? contactEmails.join(', ') : (lead.customerServiceEmail || '');

            // Handle LocalMile schedule creation
            const hasLocalMileAccess = selectedContacts.some(c => c?.accessToLocalMile === 'yes');
            if (hasLocalMileAccess) {
              for (const s of serviceSelections) {
                if ((s.name.toLowerCase().includes('ampo') || s.name.toLowerCase().includes('pmpo')) && values.createLocalMileSchedules?.[s.name]) {
                  try {
                    const freqArr = Array.isArray(s.frequency) ? s.frequency : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                    await fetch('/api/localmile/scheduled-jobs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        companyId: lead.id,
                        parentId: lead.franchisee || '',
                        startDate: values.startDate ? format(values.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                        frequency: freqArr,
                        service: s.name,
                        customer: {
                          company: lead.companyName,
                          address: lead.postalAddress?.street || lead.address?.street || '',
                          suburb: lead.postalAddress?.city || lead.address?.city || '',
                          state: lead.postalAddress?.state || lead.address?.state || '',
                          postcode: lead.postalAddress?.zip || lead.address?.zip || '',
                          email: selectedContacts[0]?.email || lead.customerServiceEmail || '',
                          phone: selectedContacts[0]?.phone || lead.customerPhone || ''
                        }
                      })
                    });
                  } catch (e) {
                    console.error('Failed to create localmile schedule', e);
                  }
                }
              }
            }

            const amUser = allUsers.find(u => u.displayName?.toLowerCase().trim() === lead.accountManagerAssigned?.toLowerCase().trim());
            const defaultSenderEmail = amUser?.email || user?.email || '';

            setSelectedTemplate('custom');
            setEmailPreviewData({
                to: signupEmailsString,
                cc: franchiseeEmail,
                bcc: '',
                subject: '',
                html: '<p>Hi,</p><p><br></p>',
                scfId: '',
                primaryColor: '#095C7B',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                logoUrl: '',
                senderEmail: defaultSenderEmail
            });
            setShowEmailPreview(true);
            setIsSubmitting(false);
           
           const signupDesc = selectionType === 'both' 
             ? `both services (${values.selectedServices.join(', ')}) and products`
             : selectionType === 'products'
               ? 'products only'
               : `services only (${values.selectedServices.join(', ')})`;

           await logActivity(lead.id, {
               type: 'Update',
               notes: `Processed sales option: Signup for ${signupDesc}`,
               author: user?.displayName || 'Unknown'
           });
           
           return; // Wait for user to click send email
         }
      }

      await updateLeadServices(lead.id, serviceSelections);

      const actionDesc = selectionType === 'both' 
        ? `both services (${values.selectedServices.join(', ')}) and products`
        : selectionType === 'products'
          ? 'products only'
          : `services only (${values.selectedServices.join(', ')})`;

      await logActivity(lead.id, {
          type: 'Update',
          notes: `Processed sales option: ${mode} for ${actionDesc}`,
          author: user?.displayName || 'Unknown'
      });

      toast({
        title: 'Success!',
        description: `The ${mode.toLowerCase()} has been configured successfully.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save service selection:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save service selection. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {!lead ? (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Loading...</DialogTitle>
                <div className="py-8 flex justify-center"><Loader /></div>
            </DialogHeader>
        </DialogContent>
      ) : (
        <DialogContent id="step-scf-form" className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-4 border-b">
              <DialogTitle>{mode} for {mode === 'Free Trial' ? 'Services' : 'Services & Products'}</DialogTitle>
              <DialogDescription>
              Configure the required details for {lead.companyName}.
              </DialogDescription>
          </DialogHeader>
          
          {showEmailPreview ? (
             <div className="flex-1 flex flex-col overflow-hidden pt-4">
               <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0">
                 {(mode === 'Signup' || mode === 'Quote') && (
                   <div className="space-y-2">
                     <Label>Email Template</Label>
                     <Select value={selectedTemplate} onValueChange={applyTemplate}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select a template" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="custom">Custom Email</SelectItem>
                         {templates.map(t => (
                           <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
                 <div className="space-y-2">
                    <Label>From</Label>
                    <Select 
                      value={emailPreviewData.senderEmail} 
                      onValueChange={(val) => setEmailPreviewData(prev => ({ ...prev, senderEmail: val }))}
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
                 <div className="space-y-2">
                   <Label>To</Label>
                   <Input value={emailPreviewData.to} disabled className="bg-muted" />
                 </div>
                 <div className="space-y-2">
                   <Label>CC (Comma separated)</Label>
                   <Input 
                     value={emailPreviewData.cc} 
                     onChange={e => setEmailPreviewData(prev => ({...prev, cc: e.target.value}))} 
                     placeholder="e.g. manager@mailplus.com.au"
                   />
                   {franchiseeEmail && !emailPreviewData.cc.includes(franchiseeEmail) && (
                     <p className="text-xs text-muted-foreground mt-1 cursor-pointer hover:underline" onClick={() => setEmailPreviewData(prev => ({...prev, cc: prev.cc ? `${prev.cc}, ${franchiseeEmail}` : franchiseeEmail}))}>
                       Suggestion (Franchisee): {franchiseeEmail}
                     </p>
                   )}
                 </div>
                 <div className="space-y-2">
                   <Label>BCC (Comma separated)</Label>
                   <Input 
                     value={emailPreviewData.bcc} 
                     onChange={e => setEmailPreviewData(prev => ({...prev, bcc: e.target.value}))} 
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Subject</Label>
                   <Input 
                     value={emailPreviewData.subject} 
                     onChange={e => setEmailPreviewData(prev => ({...prev, subject: e.target.value}))} 
                   />
                 </div>
                 <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <Label>Email Body</Label>
                     <div className="flex gap-2 flex-wrap items-center">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1">
                             Placeholders <ChevronDown className="h-3 w-3" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                           <DropdownMenuItem onClick={() => insertContent('{{Contact.Name}}')}>Contact Name</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Contact.FirstName}}')}>Contact First Name</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Company.Name}}')}>Company Name</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Prospect.ProspectPlusID}}')}>Prospect+ ID</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{SalesRep.Name}}')}>Sales Rep Name</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Franchisee.Name}}')}>Franchisee Name</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{AccountManager.Name}}')}>AM Name</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{AccountManager.Mobile}}')}>AM Mobile</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{AccountManager.Calendly}}')}>AM Calendly</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Lead.ContactBookingLink}}')}>Contact Booking Link</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Lead.GeneralBookingLink}}')}>General Booking Link</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Lead.City}}')}>Lead City</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Trials.Remaining}}')}>Trials Remaining</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{acceptUrl}}')}>Accept URL (SCF Link)</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Sender.Signature}}')}>Sender Signature</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Thermoguard.Link}}')}>Thermoguard Link</DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => insertContent('{{Receiver.Name}}')}>Receiver Name</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Receiver.FullAddress}}')}>Receiver Full Address</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Ticket.Number}}')}>Ticket Number</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => insertContent('{{Tracking.ID}}')}>Tracking ID</DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => insertContent('{{unsubscribe_link}}')}>Unsubscribe Link</DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>

                       <Button
                         type="button"
                         size="sm"
                         variant="outline"
                         className="h-8 text-xs"
                         onClick={() => insertContent(generateServiceTableHtml())}
                       >
                         + Service Table
                       </Button>

                       <Button
                         type="button"
                         size="sm"
                         variant="outline"
                         className="h-8 text-xs"
                         onClick={() => insertContent('{{Thermoguard.Link}}')}
                       >
                         + Thermoguard Link
                       </Button>

                       {selectedProducts.length > 0 && (
                         <Button
                           type="button"
                           size="sm"
                           variant="outline"
                           className="h-8 text-xs"
                           onClick={() => insertContent(generateProductTableHtml())}
                         >
                           + Product Table
                         </Button>
                       )}
                     </div>
                   </div>
                   <VisualIframeEditor 
                     body={emailPreviewData.html} 
                     setBody={html => setEmailPreviewData(prev => ({...prev, html}))} 
                     primaryColor={emailPreviewData.primaryColor}
                     fontFamily={emailPreviewData.fontFamily}
                     logoUrl={emailPreviewData.logoUrl}
                   />
                 </div>
               </div>
               <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
                 <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                   Cancel
                 </Button>
                 <Button onClick={handleSendEmail} disabled={isSending}>
                   {isSending ? <Loader /> : 'Send Email'}
                 </Button>
               </DialogFooter>
             </div>
          ) : isAddingContact ? (
               <div className="flex-1 overflow-y-auto pr-2 py-4 min-h-0 space-y-4">
                 <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded} />
                 <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setIsAddingContact(false)}>Cancel</Button>
               </div>
          ) : (
              <Form {...form}>
                  <form 
                    onSubmit={form.handleSubmit(
                      handleSubmit,
                      (errors) => {
                        console.error("Form validation failed:", errors);
                        toast({
                          variant: 'destructive',
                          title: 'Form Validation Error',
                          description: 'Please check the form fields and ensure everything is filled correctly.'
                        });
                      }
                    )} 
                    className="flex-1 flex flex-col overflow-hidden pt-4"
                  >
                    <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 space-y-6 min-h-0">
                        
                        {(mode === 'Quote' || mode === 'Signup') && (
                          <div className="space-y-2 pb-4 border-b">
                            <Label className="text-sm font-semibold">{mode === 'Quote' ? 'Quote Contains' : 'Signup Configures'}</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['both', 'services', 'products'] as const).map((t) => (
                                <Button
                                  key={t}
                                  type="button"
                                  variant={selectionType === t ? 'default' : 'outline'}
                                  onClick={() => setSelectionType(t)}
                                  className="h-10 text-xs font-semibold capitalize"
                                >
                                  {t === 'both' ? 'Both' : `${t} Only`}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectionType !== null && (
                          <>
                            {(mode === 'Free Trial' || mode === 'Quote' || mode === 'Signup') && (
                          <FormField
                            control={form.control}
                            name="selectedContactIds"
                            render={() => (
                              <FormItem>
                                <FormLabel>Send {mode === 'Quote' ? 'Commencement Form' : 'Email'} To</FormLabel>
                                <div className="max-h-48 overflow-y-auto w-full rounded-md border p-4 space-y-3">
                                    {(contacts || []).map((contact, index) => {
                                      const contactVal = contact.id || contact.email || `contact-${index}`;
                                      return (
                                        <FormField
                                          key={contactVal}
                                          control={form.control}
                                          name="selectedContactIds"
                                          render={({ field }) => {
                                            const currentValue = field.value || [];
                                            const isChecked = currentValue.includes(contactVal);
                                            return (
                                              <FormItem
                                                key={contactVal}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                              >
                                                <FormControl>
                                                  <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                      return checked
                                                        ? field.onChange([...currentValue, contactVal])
                                                        : field.onChange(
                                                            currentValue.filter(
                                                              (value) => value !== contactVal
                                                            )
                                                          )
                                                    }}
                                                  />
                                                </FormControl>
                                                <FormLabel className="text-sm font-normal flex flex-col w-full cursor-pointer">
                                                  <span className="flex items-center gap-2 font-medium">
                                                    {contact.name}
                                                    {contact.isPrimary && (
                                                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 py-0 px-1.5 h-3.5 font-bold">Primary</Badge>
                                                    )}
                                                    {contact.isAccountsPayable && (
                                                      <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 py-0 px-1.5 h-3.5 font-bold">AP</Badge>
                                                    )}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">{contact.email}</span>
                                                </FormLabel>
                                              </FormItem>
                                            )
                                          }}
                                        />
                                      )
                                    })}
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setIsAddingContact(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Add New Contact
                                </Button>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {(mode === 'Quote' || mode === 'Signup') && (
                          <div className="space-y-4 border-t pt-4">
                            <h3 className="font-semibold text-sm">Chosen Pricing Plans</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="chosenPremiumPlan"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Premium Price Plan</FormLabel>
                                    <Select 
                                      disabled={!isPremiumEligible}
                                      value={isPremiumEligible ? field.value : 'None'} 
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="bg-card">
                                          <SelectValue placeholder="Select plan" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="Merchant">Merchant Selected</SelectItem>
                                        <SelectItem value="Standard">Standard</SelectItem>
                                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {!isPremiumEligible ? (
                                      <p className="text-xs text-red-500 font-medium">
                                        Not Eligible: Address is not in linked franchisee's StarTrack territory.
                                      </p>
                                    ) : (
                                      <p className="text-xs text-green-600 font-medium">
                                        Eligible: Address mapped in franchisee's territory.
                                      </p>
                                    )}
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="chosenExpressPlan"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Express Price Plan</FormLabel>
                                    <Select 
                                      value={field.value} 
                                      onValueChange={field.onChange}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="bg-card">
                                          <SelectValue placeholder="Select plan" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="Merchant">Merchant Selected</SelectItem>
                                        <SelectItem value="Standard">Standard</SelectItem>
                                        <SelectItem value="Enterprise">Enterprise</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                      Select price plan for Express speed.
                                    </p>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}

                        {(selectionType === 'services' || selectionType === 'both') && (
                          <FormField
                              control={form.control}
                              name="selectedServices"
                              render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Add Services</FormLabel>
                                  <FormControl>
                                      <Select 
                                          onValueChange={(val) => {
                                              const newName = getSuffixedName(val, field.value || []);
                                              field.onChange([...(field.value || []), newName]);
                                              form.setValue(`frequencies.${newName}`, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                                          }}
                                      >
                                          <SelectTrigger className="w-[300px] bg-card">
                                              <SelectValue placeholder="Select a service to add" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              {availableServices.map(s => (
                                                  <SelectItem key={s.internalId} value={s.label}>
                                                      {s.label}
                                                  </SelectItem>
                                              ))}
                                          </SelectContent>
                                      </Select>
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                              )}
                          />
                        )}

                        {(selectionType === 'services' || selectionType === 'both') && selectedServices.length > 0 && (
                          <div className="rounded-md border mt-6 bg-card overflow-hidden shadow-sm">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead>Service</TableHead>
                                  <TableHead>Frequency</TableHead>
                                  {(mode === 'Signup' || mode === 'Quote') && <TableHead className="w-[120px]">Rate</TableHead>}
                                  {mode === 'Signup' && <TableHead className="w-[110px]">LocalMile Sync</TableHead>}
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedServices.map((serviceName) => (
                                  <TableRow key={serviceName}>
                                    <TableCell className="font-medium align-top pt-4">
                                      {serviceName}
                                    </TableCell>
                                    <TableCell className="align-top">
                                      <FormField
                                        control={form.control}
                                        name={`frequencies.${serviceName}`}
                                        render={({ field }) => (
                                          <FormItem className="space-y-2">
                                            <FormControl>
                                              <Select
                                                onValueChange={(val) => {
                                                  if (val === 'Adhoc') {
                                                    field.onChange('Adhoc');
                                                  } else if (val === 'Daily') {
                                                    field.onChange(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                                                  } else {
                                                    field.onChange([]); // Custom, start empty
                                                  }
                                                }}
                                                value={
                                                  field.value === 'Adhoc' ? 'Adhoc' : 
                                                  (Array.isArray(field.value) && field.value.length === 5) ? 'Daily' : 'Custom'
                                                }
                                              >
                                                <SelectTrigger className="w-full min-w-[140px] h-9">
                                                  <SelectValue placeholder="Frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="Daily">Daily (Mon-Fri)</SelectItem>
                                                  <SelectItem value="Adhoc">Adhoc (On Demand)</SelectItem>
                                                  <SelectItem value="Custom">Custom Days</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </FormControl>
                                            
                                            {field.value !== 'Adhoc' && (!Array.isArray(field.value) || field.value.length !== 5) && (
                                              <div className="flex gap-1 pt-1">
                                                {days.map((day) => {
                                                  const isChecked = Array.isArray(field.value) && field.value.includes(day);
                                                  return (
                                                    <Button
                                                      key={day}
                                                      type="button"
                                                      variant={isChecked ? "default" : "outline"}
                                                      size="sm"
                                                      className="h-7 w-7 p-0 text-[10px]"
                                                      onClick={() => {
                                                        const current = Array.isArray(field.value) ? field.value : [];
                                                        const next = isChecked ? current.filter(d => d !== day) : [...current, day];
                                                        field.onChange(next);
                                                      }}
                                                    >
                                                      {day.charAt(0)}
                                                    </Button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </FormItem>
                                        )}
                                      />
                                    </TableCell>
                                    
                                    {(mode === 'Signup' || mode === 'Quote') && (
                                      <TableCell className="align-top">
                                        <FormField
                                          control={form.control}
                                          name={`rates.${serviceName}`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <div className="relative">
                                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                                  <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="pl-6 h-9"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                    value={field.value || ''}
                                                  />
                                                </div>
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </TableCell>
                                    )}
                                    
                                    {mode === 'Signup' && (
                                      <TableCell className="align-top">
                                        {(serviceName.toLowerCase().includes('ampo') || serviceName.toLowerCase().includes('pmpo')) && hasLocalMileAccessRender ? (
                                          <FormField
                                            control={form.control}
                                            name={`createLocalMileSchedules.${serviceName}`}
                                            render={({ field }) => (
                                              <FormItem className="flex flex-row items-start space-x-2 space-y-0 pt-2">
                                                <FormControl>
                                                  <Checkbox
                                                    checked={field.value || false}
                                                    onCheckedChange={field.onChange}
                                                  />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                  <FormLabel className="font-normal text-xs text-muted-foreground cursor-pointer">
                                                    Create
                                                  </FormLabel>
                                                </div>
                                              </FormItem>
                                            )}
                                          />
                                        ) : (
                                          <div className="pt-2 text-xs text-muted-foreground">-</div>
                                        )}
                                      </TableCell>
                                    )}
                                    
                                    <TableCell className="align-top text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          const newSelected = selectedServices.filter(s => s !== serviceName);
                                          form.setValue('selectedServices', newSelected);
                                          
                                          const freqs = { ...form.getValues('frequencies') };
                                          delete freqs[serviceName];
                                          form.setValue('frequencies', freqs);
                                          
                                          const rates = { ...form.getValues('rates') };
                                          delete rates[serviceName];
                                          form.setValue('rates', rates);
                                          form.clearErrors(`rates.${serviceName}` as any);
                                          form.clearErrors(`frequencies.${serviceName}` as any);
                                          
                                          const schedules = { ...form.getValues('createLocalMileSchedules') };
                                          if (schedules[serviceName] !== undefined) {
                                            delete schedules[serviceName];
                                            form.setValue('createLocalMileSchedules', schedules);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        
                        {(selectionType === 'products' || selectionType === 'both') && (mode === 'Quote' || mode === 'Signup') && (
                          <div className="space-y-4 border-t pt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <h3 className="font-bold text-sm flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary shrink-0" />
                                Add Premium Products to {mode}
                              </h3>
                              <Select value={pricePlan} onValueChange={(val) => {
                                setPricePlan(val);
                                const planProds = products.filter(p => p.pricePlan === val);
                                setSelectedProducts(planProds.map(p => p.id));
                              }}>
                                <SelectTrigger className="w-[180px] h-9 bg-card">
                                  <SelectValue placeholder="Price Plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePricePlans.map(plan => (
                                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {productsLoading ? (
                              <div className="flex justify-center py-4"><Loader /></div>
                            ) : products.filter(p => p.pricePlan === pricePlan).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No products found for this plan.</p>
                            ) : (
                              <div className="rounded-md border bg-card overflow-hidden">
                                <Table>
                                  <TableHeader className="bg-muted/50">
                                    <TableRow>
                                      <TableHead className="w-[50px]">Include</TableHead>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Weight</TableHead>
                                      <TableHead className="text-right">Base Price (Inc. GST)</TableHead>
                                      <TableHead className="text-right">Surcharge</TableHead>
                                      <TableHead className="text-right">Total (Inc. Fuel Surcharge & GST)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(() => {
                                      const filtered = products.filter(p => p.pricePlan === pricePlan);
                                      const sorted = [...filtered].sort((a, b) => {
                                        const parseWeight = (p: any) => {
                                          const weightStr = String(p.productWeight || p.weightRange || p.weight || '');
                                          const match = weightStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
                                          return match ? parseFloat(match[1]) : 999;
                                        };
                                        return parseWeight(a) - parseWeight(b);
                                      });
                                      return sorted.map(product => {
                                      const isChecked = selectedProducts.includes(product.id);
                                      const basePrice = Number(product.salesPriceIncGst || Number(product.salesPriceExcGst || 0) * 1.1);
                                      const surchargePerc = surchargeRates ? (product.deliverySpeed?.toLowerCase() === 'premium' ? surchargeRates.premium : (product.deliverySpeed?.toLowerCase() === 'express' ? surchargeRates.express : 0)) : 12.5;
                                      const surchargeAmt = basePrice * (surchargePerc / 100);
                                      const totalVal = basePrice + surchargeAmt;
                                      return (
                                        <TableRow key={product.id}>
                                          <TableCell className="align-middle">
                                            <Checkbox
                                              checked={isChecked}
                                              onCheckedChange={() => {
                                                setSelectedProducts(prev =>
                                                  isChecked ? prev.filter(id => id !== product.id) : [...prev, product.id]
                                                );
                                              }}
                                            />
                                          </TableCell>
                                          <TableCell className="font-medium text-xs align-middle">{product.name || product.id}</TableCell>
                                          <TableCell className="text-xs align-middle">{product.productWeight || '-'}</TableCell>
                                          <TableCell className="text-right text-xs align-middle">${basePrice.toFixed(2)}</TableCell>
                                          <TableCell className="text-right text-xs align-middle">
                                            {surchargePerc > 0 ? `$${surchargeAmt.toFixed(2)} (${surchargePerc}%)` : '-'}
                                          </TableCell>
                                          <TableCell className="text-right text-xs font-bold align-middle">${totalVal.toFixed(2)}</TableCell>
                                        </TableRow>
                                       );
                                     });
                                    })()}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {mode === 'Free Trial' && (
                            <FormField
                            control={form.control}
                            name="trialDateRange"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Free Trial Period (max 5 days, no weekends)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[300px] justify-start text-left font-normal bg-card hover:bg-card/90",
                                                    !field.value?.from && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {field.value?.from ? (
                                                    field.value.to ? (
                                                        <>
                                                            {format(field.value.from, "LLL dd, y")} -{" "}
                                                            {format(field.value.to, "LLL dd, y")}
                                                        </>
                                                    ) : (
                                                        format(field.value.from, "LLL dd, y")
                                                    )
                                                ) : (
                                                    <span>Pick a date range</span>
                                                )}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={field.value?.from}
                                            selected={field.value}
                                            onSelect={(range) => handleDateSelect(range, field.onChange)}
                                            numberOfMonths={2}
                                            disabled={(date) => isWeekend(date) || date < new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        )}
                        
                        {(mode === 'Signup' || mode === 'Quote') && (
                            <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Service Start Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[240px] pl-3 text-left font-normal bg-card hover:bg-card/90",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                        date < new Date() || isWeekend(date)
                                        }
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        )}

                        {mode === 'Signup' && (
                            <div className="space-y-4">
                                <FormField
                                control={form.control}
                                name="createLocalMileAccount"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-card">
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value || false}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="font-medium cursor-pointer">
                                        Create LocalMile account (0 free trials)
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                        This will provision a LocalMile account for this customer with 0 free trials.
                                        </p>
                                    </div>
                                    </FormItem>
                                )}
                                />

                                <FormField
                                control={form.control}
                                name="createShipMateAccount"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-card">
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value || false}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="font-medium cursor-pointer">
                                        Create ShipMate account
                                        </FormLabel>
                                        <p className="text-xs text-muted-foreground">
                                        This will provision a ShipMate account for this customer.
                                        </p>
                                    </div>
                                    </FormItem>
                                )}
                                />
                            </div>
                        )}

                        {selectionType !== 'products' && hasAmpoService && localLead && (
                            <div className={cn("border-2 rounded-lg p-4 transition-all duration-300", localLead.postalAddress?.street ? "border-primary/20 bg-card" : "border-amber-300 bg-amber-50/10 dark:bg-amber-950/10")}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Inbox className="w-5 h-5 text-primary" />
                                    <h3 className="font-bold">Postal / PO Box Address</h3>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4">Required for AMPO service to auto-fill the Standing Order Form.</p>
                                
                                {localLead.postalAddress?.street ? (
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-start gap-2.5">
                                            <Inbox className="w-4.5 h-4.5 text-muted-foreground mt-1 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{localLead.postalAddress.street}</p>
                                                <p className="text-sm text-muted-foreground">{localLead.postalAddress.city}, {localLead.postalAddress.state} {localLead.postalAddress.zip}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{localLead.postalAddress.country}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-xs font-semibold mb-4">
                                        <Info className="w-4 h-4 shrink-0" />
                                        <span>Please add a PO Box address to complete Standing Order requirements.</span>
                                    </div>
                                )}
                                
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    className="w-full bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/30 text-primary font-semibold py-5 rounded-full transition-all"
                                    onClick={() => setIsPostalAddressDialogOpen(true)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {localLead.postalAddress?.street ? 'Edit Postal Address' : 'Add Postal Address'}
                                </Button>
                            </div>
                        )}
                      </>
                    )}
                  </div>
                  <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                      Cancel
                      </Button>
                      {selectionType !== null && (
                        <Button id="step-netsuite-sync-btn" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader /> : ((mode === 'Quote' || mode === 'Signup') ? `Preview ${mode} Email` : 'Submit')}
                        </Button>
                      )}
                  </DialogFooter>
                  </form>
              </Form>
          )}
          {localLead && (
             <EditPostalAddressDialog 
                lead={localLead} 
                isOpen={isPostalAddressDialogOpen} 
                onOpenChange={setIsPostalAddressDialogOpen} 
                onLeadUpdated={(updates) => setLocalLead(prev => prev ? ({ ...prev, ...updates }) : prev)} 
             />
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
