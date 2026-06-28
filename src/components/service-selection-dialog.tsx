'use client';

import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Inbox, Info, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import { updateLeadServices, updateLeadStatus, updateContactSendEmail, addContactToLead, logActivity, getServices, createScfRecord, getFranchiseeByName, updateLeadCommReg, updateLeadDetails } from '@/services/firebase';
import { initiateServicesTrial, submitServiceQuote } from '@/services/netsuite-services-proxy';
import { initiateSignup } from '@/services/netsuite-signup-proxy';
import { useAuth } from '@/hooks/use-auth';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, UserPlus, Package } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format, differenceInDays, isWeekend, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import type { Lead, Contact } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { AddContactForm } from './add-contact-form';
import { EditPostalAddressDialog } from './edit-postal-address-dialog';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
  selectedServices: z.array(z.string()).min(1, 'Please select at least one service.'),
  frequencies: z.record(z.union([z.array(z.string()), z.literal('Adhoc')])),
  trialDateRange: z.custom<DateRange>().optional(),
  startDate: z.date().optional(),
  selectedContactId: z.string().optional(),
  rates: z.record(z.coerce.number().min(0)).optional(),
  createLocalMileSchedules: z.record(z.boolean()).optional(),
  createLocalMileAccount: z.boolean().optional(),
  createShipMateAccount: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  mode: 'Free Trial' | 'Signup' | 'Quote';
}

export function ServiceSelectionDialog({
  isOpen,
  onOpenChange,
  lead,
  mode,
}: ServiceSelectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isPostalAddressDialogOpen, setIsPostalAddressDialogOpen] = useState(false);
  const [localLead, setLocalLead] = useState<Lead | null>(lead);
  
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
    logoUrl: ''
  });
  const [franchiseeEmail, setFranchiseeEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const { toast } = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pricePlan, setPricePlan] = useState('Premium Merchant');
  const [availablePricePlans, setAvailablePricePlans] = useState<string[]>(['Premium Merchant', 'Standard', 'Enterprise']);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [surchargeRates, setSurchargeRates] = useState<{express: number, premium: number} | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedServices: [],
      frequencies: {},
      rates: {},
      createLocalMileSchedules: {},
      createLocalMileAccount: false,
      createShipMateAccount: false,
    },
  });

  useEffect(() => {
    if (lead) {
      setContacts(lead.contacts || []);
      if (lead.franchisee && lead.franchisee !== 'Unassigned') {
        getFranchiseeByName(lead.franchisee).then(f => {
          if (f && f.email) setFranchiseeEmail(f.email);
        });
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
    if (mode === 'Quote' && isOpen) {
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
          const snapshot = await getDocs(q);
          const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          
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
    if (isOpen) {
      fetchTemplates();
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
            logoUrl: ''
        });
    }
  }, [isOpen, form, lead]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'custom') {
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template && lead) {
      const primaryContact = contacts.find(c => c.id === form.getValues('selectedContactId')) || (contacts.length > 0 ? contacts[0] : null);
      const contactName = primaryContact?.name || 'Customer';
      
      let parsedBody = template.body || template.htmlContent || template.content || '';
      parsedBody = parsedBody.replace(/\{\{Contact\.Name\}\}/gi, contactName);
      parsedBody = parsedBody.replace(/\{\{Contact\.FirstName\}\}/gi, contactName.split(' ')[0]);
      parsedBody = parsedBody.replace(/\{\{Company\.Name\}\}/gi, lead.companyName || '');
      parsedBody = parsedBody.replace(/\{\{SalesRep\.Name\}\}/gi, user?.displayName || 'Account Manager');
      
      setEmailPreviewData(prev => ({
        ...prev,
        subject: template.subject || prev.subject,
        html: parsedBody
      }));
    }
  };

  const handleSendEmail = async () => {
    if (!lead) return;
    setIsSending(true);
    try {
      if (mode === 'Quote') {
        const res = await fetch('/api/scf/send-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              leadId: lead.id,
              contactId: form.getValues('selectedContactId'),
              scfUrl: `${window.location.origin}/scf/${emailPreviewData.scfId}`,
              scfId: emailPreviewData.scfId,
              customHtml: emailPreviewData.html,
              customSubject: emailPreviewData.subject,
              customTo: emailPreviewData.to,
              cc: emailPreviewData.cc,
              bcc: emailPreviewData.bcc
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
            subject: emailPreviewData.subject,
            html: emailPreviewData.html,
            customFrom: user?.email
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

  const handleContactAdded = async (newContactData: Omit<Contact, 'id'>) => {
    if (!lead) return;
    const newContactId = await addContactToLead(lead.id, newContactData);
    const tempContact: Contact = { ...newContactData, id: newContactId };
    setContacts((prev) => [...prev, tempContact]);
    form.setValue('selectedContactId', tempContact.id);
    setIsAddingContact(false);
  };


  const handleSubmit = async (values: FormValues) => {
    if (!lead) return;
    
    if (mode === 'Free Trial' && !values.trialDateRange?.from) {
      form.setError('trialDateRange', { type: 'manual', message: 'Please select a trial period.' });
      return;
    }
    if ((mode === 'Free Trial' || mode === 'Quote') && !values.selectedContactId) {
      form.setError('selectedContactId', { type: 'manual', message: 'Please select a contact.' });
      return;
    }
    if (mode === 'Signup' && !values.startDate) {
      form.setError('startDate', { type: 'manual', message: 'Please select a start date.' });
      return;
    }
    if ((mode === 'Signup' || mode === 'Quote') && values.selectedServices.some(s => !values.rates?.[s])) {
      toast({ variant: 'destructive', title: 'Missing Rate', description: 'Please provide a rate for all selected services.' });
      return;
    }
    if ((mode === 'Signup' || mode === 'Quote') && values.selectedServices.some(s => !values.rates?.[s])) {
      toast({ variant: 'destructive', title: 'Missing Rate', description: 'Please provide a rate for all selected services.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const serviceSelections = values.selectedServices.map(serviceName => {
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
        if (values.selectedContactId) {
            await updateContactSendEmail(lead.id, values.selectedContactId);
        }

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

        // Trigger NetSuite Sync in background
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


        if (mode === 'Quote') {
           const scfId = await createScfRecord(lead.id, {
               contactId: values.selectedContactId,
               services: serviceSelections,
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
                     contactId: values.selectedContactId,
                     scfUrl,
                     startDate: values.startDate ? format(values.startDate, 'MMM dd, yyyy') : '',
                     services: serviceSelections,
                     products: products.filter(p => selectedProducts.includes(p.id))
                 })
             });
             const data = await res.json();
             if (data.success) {
                 await updateLeadServices(lead.id, serviceSelections);
                 
                 setEmailPreviewData({
                     to: data.contactEmail,
                     cc: franchiseeEmail,
                     bcc: '',
                     subject: data.subject,
                     html: data.html,
                     scfId,
                     primaryColor: data.primaryColor || '#095C7B',
                     fontFamily: data.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                     logoUrl: data.logoUrl || ''
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
           
           const primaryContact = contacts.find(c => c.id === values.selectedContactId) || (contacts.length > 0 ? contacts[0] : null);
           
           // Handle LocalMile schedule creation
           const hasLocalMileAccess = primaryContact?.accessToLocalMile === 'yes';
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
                         email: primaryContact?.email || lead.customerServiceEmail || '',
                         phone: primaryContact?.phone || lead.customerPhone || ''
                       }
                     })
                   });
                 } catch (e) {
                   console.error('Failed to create localmile schedule', e);
                 }
               }
             }
           }

           setEmailPreviewData({
               to: primaryContact?.email || lead.customerServiceEmail || '',
               cc: franchiseeEmail,
               bcc: '',
               subject: 'Welcome to MailPlus',
               html: '<p>Hi,</p><p>Welcome to MailPlus!</p>',
               scfId: '',
               primaryColor: '#095C7B',
               fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
               logoUrl: ''
           });
           setShowEmailPreview(true);
           setIsSubmitting(false);
           
           await logActivity(lead.id, {
               type: 'Update',
               notes: `Processed sales option: Signup for services (${values.selectedServices.join(', ')})`,
               author: user?.displayName || 'Unknown'
           });
           
           return; // Wait for user to click send email
         }
      }

      await updateLeadServices(lead.id, serviceSelections);

      await logActivity(lead.id, {
          type: 'Update',
          notes: `Processed sales option: ${mode} for services (${values.selectedServices.join(', ')})`,
          author: user?.displayName || 'Unknown'
      });

      toast({
        title: 'Success!',
        description: `The ${mode.toLowerCase()} has been configured for the selected services.`,
      });
      onOpenChange(false);
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
        <DialogContent id="step-scf-form" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle>{mode} for Services</DialogTitle>
              <DialogDescription>
              Configure the required services, their frequency, and other details for {lead.companyName}.
              </DialogDescription>
          </DialogHeader>
          
          {showEmailPreview ? (
             <div className="space-y-4">
               {(mode === 'Signup' || mode === 'Quote') && templates.length > 0 && (
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
                 <Label>Email Body</Label>
                 <VisualIframeEditor 
                   body={emailPreviewData.html} 
                   setBody={html => setEmailPreviewData(prev => ({...prev, html}))} 
                   primaryColor={emailPreviewData.primaryColor}
                   fontFamily={emailPreviewData.fontFamily}
                   logoUrl={emailPreviewData.logoUrl}
                 />
               </div>
               <DialogFooter className="flex-shrink-0 pt-4 border-t mt-6">
                 <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                   Cancel
                 </Button>
                 <Button onClick={handleSendEmail} disabled={isSending}>
                   {isSending ? <Loader /> : 'Send Email'}
                 </Button>
               </DialogFooter>
             </div>
          ) : isAddingContact ? (
              <div className="py-4">
              <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded} />
              <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setIsAddingContact(false)}>Cancel</Button>
              </div>
          ) : (
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                      <div className="space-y-6">
                        {(mode === 'Free Trial' || mode === 'Quote') && (
                            <FormField
                            control={form.control}
                            name="selectedContactId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Send Commencement Form To</FormLabel>
                                <ScrollArea className="max-h-32 w-full rounded-md border">
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="p-4"
                                    >
                                    {(contacts || []).map((contact, index) => {
                                        const radioValue = contact.id || contact.email || `contact-${index}`;
                                        return (
                                        <FormItem key={radioValue} className="flex items-center space-x-3">
                                        <FormControl>
                                            <RadioGroupItem value={radioValue} />
                                        </FormControl>
                                        <FormLabel className="font-normal flex flex-col w-full">
                                            <span className="flex items-center gap-2">
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
                                        );
                                    })}
                                    </RadioGroup>
                                </ScrollArea>
                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setIsAddingContact(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Add New Contact
                                </Button>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        )}



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

                        {selectedServices.length > 0 && (
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
                                          if (rates[serviceName]) {
                                            delete rates[serviceName];
                                            form.setValue('rates', rates);
                                          }
                                          
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
                        
                        {mode === 'Quote' && (
                          <div className="space-y-4 border-t pt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <h3 className="font-bold text-sm flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary shrink-0" />
                                Add Premium Products to Quote
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
                                      <TableHead className="text-right">Base Price</TableHead>
                                      <TableHead className="text-right">Surcharge</TableHead>
                                      <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {products.filter(p => p.pricePlan === pricePlan).map(product => {
                                      const isChecked = selectedProducts.includes(product.id);
                                      const basePrice = Number(product.salesPriceExcGst || 0);
                                      const surchargePerc = surchargeRates ? (product.deliverySpeed?.toLowerCase() === 'premium' ? surchargeRates.premium : (product.deliverySpeed?.toLowerCase() === 'express' ? surchargeRates.express : 0)) : 0;
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
                                    })}
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

                        {hasAmpoService && localLead && (
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
                      </div>
                    </ScrollArea>
                  <DialogFooter className="flex-shrink-0 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                      Cancel
                      </Button>
                      <Button id="step-netsuite-sync-btn" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader /> : ((mode === 'Quote' || mode === 'Signup') ? `Preview ${mode} Email` : 'Submit')}
                      </Button>
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
