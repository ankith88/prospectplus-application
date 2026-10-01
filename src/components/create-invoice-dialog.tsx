"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  DollarSign, 
  HelpCircle, 
  Lock, 
  Layers, 
  Search, 
  Check, 
  ChevronsUpDown, 
  ChevronDown, 
  Eye, 
  Building2, 
  FileText, 
  MapPin, 
  Edit3, 
  RotateCcw 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import type { Lead, ServiceSelection } from '@/lib/types';
import { 
  calculateServiceWorkingDays, 
  normalizeState, 
  normalizeFrequencyDays,
  ServiceFrequencyCalculation 
} from '@/lib/australian-state-holidays';
import { 
  STANDARD_NETSUITE_SERVICES, 
  AVAILABLE_SERVICES as DEFAULT_SERVICES,
  AVAILABLE_EXTRAS as DEFAULT_EXTRAS,
  resolveServiceCatalogItem,
  canCreateCustomerInvoice,
  ServiceCatalogItem 
} from '@/lib/invoice-services-catalog';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';

interface InvoiceLineDraft {
  id: string;
  itemId: string;
  itemName: string;
  displayName?: string;
  itemType: 'service' | 'extra';
  isFixedRate: boolean;
  frequency: string; // e.g. "Mon,Wed,Fri" or "Daily" or "Adhoc"
  qty: number;
  rate: number;
  amount: number;
  itemDetails: string;
  isAutoCalculated: boolean;
  calcBreakdown?: ServiceFrequencyCalculation;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Partial<Lead> & { id: string };
  onInvoiceCreated?: (invoiceId: string) => void;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  company,
  onInvoiceCreated
}: CreateInvoiceDialogProps) {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  // Role validation
  const hasAccess = canCreateCustomerInvoice(userProfile, isSuperAdmin);

  // Dynamic services from Firestore 'services' collection
  const [catalogItems, setCatalogItems] = useState<ServiceCatalogItem[]>(STANDARD_NETSUITE_SERVICES);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  // Billing period state
  const [periodPreset, setPeriodPreset] = useState<'lastMonth' | 'thisMonth' | 'custom'>('lastMonth');
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');

  // Customer identifiers (Maintained internally, hidden from user view/edit)
  const [customerId, setCustomerId] = useState<string>('');
  const [franchiseeId, setFranchiseeId] = useState<string>('');
  
  // Editable fields
  const [customerPo, setCustomerPo] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<string>('Service');

  // Franchisee role lockout for invoiceType
  const isFranchiseeRole = useMemo(() => {
    const role = (userProfile?.activeRole || userProfile?.role || '').toLowerCase().trim();
    return role.includes('franchisee') && !isSuperAdmin;
  }, [userProfile, isSuperAdmin]);

  // Editable Billing Address state
  const [billingName, setBillingName] = useState<string>('');
  const [billingPoBox, setBillingPoBox] = useState<string>('');
  const [billingStreet1, setBillingStreet1] = useState<string>('');
  const [billingStreet2, setBillingStreet2] = useState<string>('');
  const [billingSuburb, setBillingSuburb] = useState<string>('');
  const [billingState, setBillingState] = useState<string>('NSW');
  const [billingPostcode, setBillingPostcode] = useState<string>('');
  const [billingAbn, setBillingAbn] = useState<string>('');
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);

  // Line items state
  const [lines, setLines] = useState<InvoiceLineDraft[]>([]);

  // Admin fee state
  const [includeAdminFee, setIncludeAdminFee] = useState<boolean>(true);
  const [adminFeeQty, setAdminFeeQty] = useState<number>(1);
  const [adminFeeRate, setAdminFeeRate] = useState<number>(9.00);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Row popover open state for item picker
  const [activePickerRowId, setActivePickerRowId] = useState<string | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');

  // Company-scoped addresses (Only addresses belonging to this company and its sites/branches/parent)
  const [companyAddresses, setCompanyAddresses] = useState<Array<{
    id: string;
    label: string;
    companyName: string;
    poBox: string;
    street1: string;
    street2: string;
    suburb: string;
    state: string;
    postcode: string;
    abn: string;
    isDefault?: boolean;
  }>>([]);
  const [loadingCompanyAddresses, setLoadingCompanyAddresses] = useState<boolean>(false);
  const [addressFilterQuery, setAddressFilterQuery] = useState<string>('');
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState<boolean>(false);

  // Load all addresses belonging specifically to this company
  useEffect(() => {
    if (!open || !company?.id) return;

    let isMounted = true;
    async function fetchAllCompanyAddresses() {
      setLoadingCompanyAddresses(true);
      const list: Array<{
        id: string;
        label: string;
        companyName: string;
        poBox: string;
        street1: string;
        street2: string;
        suburb: string;
        state: string;
        postcode: string;
        abn: string;
        isDefault?: boolean;
      }> = [];

      const seenKeys = new Set<string>();
      const addIfUnique = (item: {
        id: string;
        label: string;
        companyName: string;
        poBox?: string;
        street1?: string;
        street2?: string;
        suburb?: string;
        state?: string;
        postcode?: string;
        abn?: string;
        isDefault?: boolean;
      }) => {
        const po = (item.poBox || '').trim();
        const s1 = (item.street1 || '').trim();
        const sub = (item.suburb || '').trim();
        const st = (item.state || 'NSW').trim().toUpperCase();
        const pc = (item.postcode || '').trim();
        const key = `${po}|${s1}|${sub}|${st}|${pc}`.toLowerCase();

        if ((!po && !s1 && !sub) || seenKeys.has(key)) return;
        seenKeys.add(key);

        list.push({
          id: item.id,
          label: item.label,
          companyName: item.companyName || company.companyName || 'Valued Customer',
          poBox: po,
          street1: s1,
          street2: (item.street2 || '').trim(),
          suburb: sub,
          state: st || 'NSW',
          postcode: pc,
          abn: item.abn || company.abn || '',
          isDefault: Boolean(item.isDefault)
        });
      };

      // 1. Company Primary Billing Address
      const billAddr = (company as any).billingAddress || {};
      addIfUnique({
        id: 'primary-billing',
        label: 'Primary Billing Address',
        companyName: billAddr.name || billAddr.companyName || company.companyName || '',
        poBox: (company as any).poBox || billAddr.poBox || '',
        street1: billAddr.street1 || billAddr.street || (company as any).street || '',
        street2: billAddr.street2 || '',
        suburb: billAddr.suburb || billAddr.city || (company as any).city || '',
        state: billAddr.state || company.state || 'NSW',
        postcode: billAddr.postcode || billAddr.postalCode || (company as any).postcode || '',
        abn: billAddr.abn || company.abn || '',
        isDefault: true
      });

      // 2. Company Physical / Head Office Address
      const physAddr = (company as any).address || (company as any).customerAddress || {};
      addIfUnique({
        id: 'head-office-phys',
        label: 'Head Office / Physical Address',
        companyName: company.companyName || '',
        poBox: (company as any).poBox || physAddr.poBox || '',
        street1: physAddr.street1 || physAddr.street || (company as any).street || '',
        street2: physAddr.street2 || '',
        suburb: physAddr.suburb || physAddr.city || (company as any).city || '',
        state: physAddr.state || company.state || 'NSW',
        postcode: physAddr.postcode || physAddr.postalCode || (company as any).postcode || '',
        abn: company.abn || ''
      });

      // 3. Company Embedded Locations Array
      if (Array.isArray((company as any).locations)) {
        (company as any).locations.forEach((loc: any, idx: number) => {
          const lAddr = loc.address || loc;
          addIfUnique({
            id: `loc-${idx}-${loc.id || loc.name || idx}`,
            label: `Location: ${loc.name || loc.locationName || `Site #${idx + 1}`}`,
            companyName: loc.name || company.companyName || '',
            poBox: loc.poBox || lAddr.poBox || '',
            street1: lAddr.street1 || lAddr.street || '',
            street2: lAddr.street2 || '',
            suburb: lAddr.suburb || lAddr.city || '',
            state: lAddr.state || 'NSW',
            postcode: lAddr.postcode || lAddr.postalCode || '',
            abn: loc.abn || company.abn || ''
          });
        });
      }

      // 4. Company Embedded Sites Array
      if (Array.isArray((company as any).sites)) {
        (company as any).sites.forEach((site: any, idx: number) => {
          const sAddr = site.address || site;
          addIfUnique({
            id: `site-${idx}-${site.id || site.name || idx}`,
            label: `Site: ${site.name || site.siteName || `Site #${idx + 1}`}`,
            companyName: site.name || company.companyName || '',
            poBox: site.poBox || sAddr.poBox || '',
            street1: sAddr.street1 || sAddr.street || '',
            street2: sAddr.street2 || '',
            suburb: sAddr.suburb || sAddr.city || '',
            state: sAddr.state || 'NSW',
            postcode: sAddr.postcode || sAddr.postalCode || '',
            abn: site.abn || company.abn || ''
          });
        });
      }

      // 5. Subcollection addresses from Firestore: companies/{company.id}/addresses
      try {
        const addrSubSnap = await getDocs(collection(firestore, 'companies', company.id, 'addresses'));
        if (!addrSubSnap.empty) {
          addrSubSnap.docs.forEach((docSnap) => {
            const d = docSnap.data();
            addIfUnique({
              id: `sub-addr-${docSnap.id}`,
              label: d.label || d.name || 'Additional Branch Address',
              companyName: d.companyName || company.companyName || '',
              poBox: d.poBox || '',
              street1: d.street1 || d.street || '',
              street2: d.street2 || '',
              suburb: d.suburb || d.city || '',
              state: d.state || 'NSW',
              postcode: d.postcode || d.postalCode || '',
              abn: d.abn || company.abn || ''
            });
          });
        }
      } catch (e) {
        console.warn('Could not fetch subcollection addresses:', e);
      }

      // 6. Child Branches in Firestore companies collection where parentCompanyId === company.id
      try {
        const childSnap = await getDocs(query(collection(firestore, 'companies'), where('parentCompanyId', '==', company.id), limit(25)));
        if (!childSnap.empty) {
          childSnap.docs.forEach((childDoc) => {
            const cd = childDoc.data();
            const cAddr = cd.billingAddress || cd.address || cd.customerAddress || {};
            addIfUnique({
              id: `child-${childDoc.id}`,
              label: `Branch: ${cd.companyName || cd.name || 'Branch'}`,
              companyName: cd.companyName || cd.name || company.companyName || '',
              poBox: cd.poBox || cAddr.poBox || '',
              street1: cAddr.street1 || cAddr.street || cd.street || '',
              street2: cAddr.street2 || '',
              suburb: cAddr.suburb || cAddr.city || cd.city || '',
              state: cAddr.state || cd.state || 'NSW',
              postcode: cAddr.postcode || cAddr.postalCode || cd.postcode || '',
              abn: cd.abn || company.abn || ''
            });
          });
        }
      } catch (e) {
        console.warn('Could not fetch child companies:', e);
      }

      // 7. Parent Company Address if this company has parentCompanyId
      const parentId = (company as any).parentCompanyId || (company as any).parentId;
      if (parentId) {
        try {
          const parentSnap = await getDocs(query(collection(firestore, 'companies'), where('__name__', '==', parentId), limit(1)));
          if (!parentSnap.empty) {
            const pd = parentSnap.docs[0].data();
            const pAddr = pd.billingAddress || pd.address || pd.customerAddress || {};
            addIfUnique({
              id: `parent-${parentSnap.docs[0].id}`,
              label: `Head Office / Parent: ${pd.companyName || 'Parent Company'}`,
              companyName: pd.companyName || company.companyName || '',
              poBox: pd.poBox || pAddr.poBox || '',
              street1: pAddr.street1 || pAddr.street || pd.street || '',
              street2: pAddr.street2 || '',
              suburb: pAddr.suburb || pAddr.city || pd.city || '',
              state: pAddr.state || pd.state || 'NSW',
              postcode: pAddr.postcode || pAddr.postalCode || pd.postcode || '',
              abn: pd.abn || company.abn || ''
            });
          }
        } catch (e) {
          console.warn('Could not fetch parent company:', e);
        }
      }

      if (isMounted) {
        setCompanyAddresses(list);
        setLoadingCompanyAddresses(false);
      }
    }

    fetchAllCompanyAddresses();
    return () => {
      isMounted = false;
    };
  }, [open, company]);

  // Helper to toggle a single day (Mon, Tue, Wed, Thu, Fri) in frequency
  const toggleWeekdayInFrequency = (lineId: string, dayToToggle: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri') => {
    setLines(prev =>
      prev.map(item => {
        if (item.id !== lineId) return item;

        const currentNorm = normalizeFrequencyDays(item.frequency);
        const currentDays: string[] = Array.isArray(currentNorm) ? [...currentNorm] : [];

        let nextDays: string[];
        if (currentDays.includes(dayToToggle)) {
          nextDays = currentDays.filter(d => d !== dayToToggle);
        } else {
          const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          nextDays = [...currentDays, dayToToggle].sort((a, b) => order.indexOf(a) - order.indexOf(b));
        }

        const nextFreq = nextDays.length > 0 ? nextDays.join(',') : '';
        
        let newQty = 0;
        let calc: ServiceFrequencyCalculation | undefined;
        if (nextFreq && startDateStr && endDateStr) {
          calc = calculateServiceWorkingDays(startDateStr, endDateStr, nextFreq, customerState);
          newQty = calc.billableDaysCount;
        }

        return {
          ...item,
          frequency: nextFreq,
          qty: newQty,
          amount: Number((newQty * item.rate).toFixed(2)),
          isAutoCalculated: Boolean(nextFreq),
          calcBreakdown: calc
        };
      })
    );
  };

  // Customer state for public holiday calculation (automatically adapts if billing state changes)
  const customerState = useMemo(() => {
    return normalizeState(billingState || company.address?.state || company.state || 'NSW');
  }, [billingState, company]);

  // Fetch Firestore 'services' collection when dialog opens
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoadingServices(true);

    const fetchFirestoreServices = async () => {
      try {
        const q = query(collection(firestore, 'services'), where('isActive', '==', true));
        const snap = await getDocs(q);

        if (!snap.empty && isMounted) {
          const loaded: ServiceCatalogItem[] = snap.docs.map(doc => {
            const data = doc.data();
            const rawCat = String(data.category || '').trim();
            const isExtra = rawCat.toLowerCase().includes('extra');
            const rawCode = String(data.code || data.netsuiteItemName || data.name || doc.id).trim();
            const rawName = String(data.netsuiteItemName || data.code || rawCode).trim();
            const basePrice = data.basePrice != null && !isNaN(Number(data.basePrice)) ? Number(data.basePrice) : null;
            
            // Fixed rate extras: items under category 'Extras' with a predefined positive basePrice
            const isFixed = isExtra && rawCat === 'Extras' && basePrice != null && basePrice > 0;

            return {
              itemId: String(data.netsuiteItemId || data.id || doc.id).trim(),
              itemName: rawCode,
              defaultRate: basePrice ?? (isExtra ? 0 : 10.00),
              category: (rawCat || (isExtra ? 'Extras' : 'Services')) as any,
              itemType: isExtra ? 'extra' : 'service',
              isFixedRate: isFixed,
              defaultFrequency: isExtra ? 'Adhoc' : 'Mon,Tue,Wed,Thu,Fri',
              description: rawName !== rawCode ? rawName : undefined
            };
          });

          // Sort by name
          loaded.sort((a, b) => a.itemName.localeCompare(b.itemName));
          setCatalogItems(loaded);
        }
      } catch (err) {
        console.warn('[CreateInvoiceDialog] Failed to fetch services collection, using fallback:', err);
      } finally {
        if (isMounted) setLoadingServices(false);
      }
    };

    fetchFirestoreServices();

    return () => {
      isMounted = false;
    };
  }, [open]);

  // Split into available services and available extras
  const availableServices = useMemo(() => {
    return catalogItems.filter(item => item.itemType === 'service');
  }, [catalogItems]);

  const availableExtras = useMemo(() => {
    return catalogItems.filter(item => item.itemType === 'extra');
  }, [catalogItems]);

  // Set default dates on preset change
  const setPresetDates = useCallback((preset: 'lastMonth' | 'thisMonth' | 'custom') => {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === 'lastMonth') {
      const prevMonthDate = subMonths(now, 1);
      const start = startOfMonth(prevMonthDate);
      const end = endOfMonth(prevMonthDate);
      setStartDateStr(format(start, 'dd/MM/yyyy'));
      setEndDateStr(format(end, 'dd/MM/yyyy'));
    } else if (preset === 'thisMonth') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      setStartDateStr(format(start, 'dd/MM/yyyy'));
      setEndDateStr(format(end, 'dd/MM/yyyy'));
    }
  }, []);

  // Initialize dialog values when opened
  useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      return;
    }

    // 1. Resolve NetSuite Customer ID (Hidden from UI)
    const resolvedCustomerId = 
      company.customerEntityId || 
      company.internalid || 
      company.internalId || 
      company.salesRecordInternalId || 
      company.id;
    setCustomerId(String(resolvedCustomerId || '').trim());

    // 2. Resolve Franchisee ID (Hidden from UI)
    const resolvedFranchiseeId = 
      company.franchisee_id || 
      (company as any).franchiseeId || 
      (company as any).franchiseeInternalId || 
      userProfile?.franchiseeId || 
      userProfile?.franchiseeInternalId || 
      '';
    setFranchiseeId(String(resolvedFranchiseeId || '').trim());

    // 3. Customer PO#
    const initialPo = 
      (company as any).customerPO || 
      (company as any).customerPo || 
      (company as any).poNumber || 
      (company as any).purchaseOrderNumber || 
      '';
    setCustomerPo(String(initialPo || '').trim());

    // 4. Initialize Billing Address
    const addr = (company as any)?.billingAddress || company?.address || (company as any)?.customerAddress || {};
    const initName = company?.companyName || (company as any)?.name || 'Valued Customer';
    const initPoBox = (company as any)?.poBox || addr?.poBox || addr?.box || '';
    const initStreet1 = addr?.street1 || addr?.street || (company as any)?.street || (company as any)?.address1 || '';
    const initStreet2 = addr?.street2 || (company as any)?.address2 || '';
    const initSuburb = addr?.suburb || addr?.city || (company as any)?.suburb || (company as any)?.city || '';
    const initState = addr?.state || company?.state || 'NSW';
    const initPostcode = addr?.postcode || addr?.postalCode || (company as any)?.postcode || (company as any)?.postalCode || '';
    const initAbn = company?.abn || (company as any)?.custentity_abn || '';

    setBillingName(initName);
    setBillingPoBox(initPoBox);
    setBillingStreet1(initStreet1);
    setBillingStreet2(initStreet2);
    setBillingSuburb(initSuburb);
    setBillingState(initState);
    setBillingPostcode(initPostcode);
    setBillingAbn(initAbn);
    setIsEditingAddress(false);

    // 5. Set default dates (Last Month)
    setPresetDates('lastMonth');

    // 6. Build initial line items from company services / rates
    const initialLines: InvoiceLineDraft[] = [];

    const now = new Date();
    const prevMonthDate = subMonths(now, 1);
    const defaultStart = format(startOfMonth(prevMonthDate), 'dd/MM/yyyy');
    const defaultEnd = format(endOfMonth(prevMonthDate), 'dd/MM/yyyy');
    const sStart = startDateStr || defaultStart;
    const sEnd = endDateStr || defaultEnd;

    const amRate = Number((company as any).ampoRate || company.ampoRate || 0);
    const pmRate = Number((company as any).pmpoRate || company.pmpoRate || 0);
    const addBagRate = Number((company as any).additionalBagRate || company.additionalBagRate || 0);

    const existingServices = company.services || [];

    if (existingServices.length > 0) {
      existingServices.forEach((s: ServiceSelection, idx: number) => {
        const cat = resolveServiceCatalogItem(s.name);
        let freq = '';
        if (Array.isArray(s.frequency) && s.frequency.length > 0) {
          freq = s.frequency.join(',');
        } else if (typeof s.frequency === 'string' && s.frequency.trim()) {
          freq = s.frequency.trim();
        }

        const isExtra = cat?.itemType === 'extra';
        const isFixed = cat?.isFixedRate ?? false;
        const rate = isFixed ? (cat?.defaultRate || 0) : (s.rate != null && s.rate > 0 ? s.rate : (cat?.defaultRate || 10.00));

        const calc = (!isExtra && freq) ? calculateServiceWorkingDays(sStart, sEnd, freq, customerState) : undefined;
        const computedQty = isExtra ? 1 : (calc ? calc.billableDaysCount : 0);
        const computedAmount = Number((computedQty * rate).toFixed(2));

        initialLines.push({
          id: `line-${idx}-${Date.now()}`,
          itemId: cat?.itemId || (idx === 0 ? '501' : '502'),
          itemName: s.name || cat?.itemName || 'Service',
          displayName: cat?.description || s.name || cat?.itemName,
          itemType: isExtra ? 'extra' : 'service',
          isFixedRate: isFixed,
          frequency: isExtra ? 'Adhoc' : freq,
          qty: computedQty,
          rate: rate,
          amount: computedAmount,
          itemDetails: '',
          isAutoCalculated: !isExtra && Boolean(freq),
          calcBreakdown: calc
        });
      });
    } else {
      // Fallback to explicit rate properties if no services array exists
      if (amRate > 0) {
        initialLines.push({
          id: `line-am-${Date.now()}`,
          itemId: '501',
          itemName: 'AMPO',
          displayName: 'AM Mail Pickup from Post Office',
          itemType: 'service',
          isFixedRate: false,
          frequency: '',
          qty: 0,
          rate: amRate,
          amount: 0,
          itemDetails: '',
          isAutoCalculated: false
        });
      }
      if (pmRate > 0) {
        initialLines.push({
          id: `line-pm-${Date.now()}`,
          itemId: '502',
          itemName: 'PMPO',
          displayName: 'PM Mail Lodgement to Post Office',
          itemType: 'service',
          isFixedRate: false,
          frequency: '',
          qty: 0,
          rate: pmRate,
          amount: 0,
          itemDetails: '',
          isAutoCalculated: false
        });
      }
      if (addBagRate > 0) {
        initialLines.push({
          id: `line-bag-${Date.now()}`,
          itemId: '10910',
          itemName: 'Additional LPO Bag',
          displayName: 'Additional Post Office Mail Bag',
          itemType: 'extra',
          isFixedRate: true,
          frequency: 'Adhoc',
          qty: 1,
          rate: 3.50, // Standard fixed predefined rate
          amount: 3.50,
          itemDetails: '',
          isAutoCalculated: false
        });
      }
    }

    // If still no services found, provide a blank AMPO template row
    if (initialLines.length === 0) {
      initialLines.push({
        id: `line-default-${Date.now()}`,
        itemId: '501',
        itemName: 'AMPO',
        displayName: 'AM Mail Pickup from Post Office',
        itemType: 'service',
        isFixedRate: false,
        frequency: '',
        qty: 0,
        rate: 12.50,
        amount: 0,
        itemDetails: '',
        isAutoCalculated: false
      });
    }

    setLines(initialLines);

  }, [open, company, userProfile, setPresetDates]);

  // Recalculate quantities when dates or frequency changes for services
  useEffect(() => {
    if (!startDateStr || !endDateStr || lines.length === 0) return;

    setLines(prevLines =>
      prevLines.map(line => {
        if (!line.isAutoCalculated) return line;

        const calc = calculateServiceWorkingDays(
          startDateStr,
          endDateStr,
          line.frequency,
          customerState
        );

        const newQty = calc.billableDaysCount;
        const newAmount = Number((newQty * line.rate).toFixed(2));

        return {
          ...line,
          qty: newQty,
          amount: newAmount,
          calcBreakdown: calc
        };
      })
    );
  }, [startDateStr, endDateStr, customerState]);

  // Helper to find a catalog item by code or name
  const findItemInCatalog = useCallback((nameOrCode: string): ServiceCatalogItem | undefined => {
    const lower = nameOrCode.toLowerCase().trim();
    return (
      catalogItems.find(i => i.itemName.toLowerCase() === lower) ||
      catalogItems.find(i => (i.description || '').toLowerCase() === lower) ||
      resolveServiceCatalogItem(nameOrCode) ||
      undefined
    );
  }, [catalogItems]);

  // Handler to change an item from catalog
  const handleSelectItem = (id: string, catalogItem: ServiceCatalogItem) => {
    setLines(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const isExtra = catalogItem.itemType === 'extra';
        const isFixed = catalogItem.isFixedRate ?? false;
        const defaultRate = catalogItem.defaultRate;
        const defaultFreq = catalogItem.defaultFrequency || (isExtra ? 'Adhoc' : 'Mon,Tue,Wed,Thu,Fri');

        let newQty = item.qty;
        let calc: ServiceFrequencyCalculation | undefined;

        if (!isExtra) {
          calc = calculateServiceWorkingDays(startDateStr, endDateStr, defaultFreq, customerState);
          newQty = calc.billableDaysCount;
        } else {
          newQty = item.qty > 0 ? item.qty : 1;
        }

        const rate = isFixed ? defaultRate : (item.rate > 0 && !item.isFixedRate ? item.rate : defaultRate);
        const amount = Number((newQty * rate).toFixed(2));

        return {
          ...item,
          itemName: catalogItem.itemName,
          displayName: catalogItem.description || catalogItem.itemName,
          itemId: catalogItem.itemId,
          itemType: catalogItem.itemType,
          isFixedRate: isFixed,
          frequency: defaultFreq,
          qty: newQty,
          rate: rate,
          amount: amount,
          isAutoCalculated: !isExtra,
          calcBreakdown: calc
        };
      })
    );

    setActivePickerRowId(null);
    setPickerSearchQuery('');
  };

  // Handler to update a line item field
  const updateLine = (id: string, field: keyof InvoiceLineDraft, value: any) => {
    setLines(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        // If rate is fixed, prevent manual edit
        if (field === 'rate' && item.isFixedRate) {
          return item;
        }

        const updated = { ...item, [field]: value };

        if (field === 'qty' || field === 'rate') {
          const q = field === 'qty' ? Math.max(0, Number(value || 0)) : item.qty;
          const r = field === 'rate' ? Math.max(0, Number(value || 0)) : item.rate;
          updated.qty = q;
          updated.rate = r;
          updated.amount = Number((q * r).toFixed(2));
          if (field === 'qty') {
            updated.isAutoCalculated = false; // User manually overrode quantity
          }
        }

        if (field === 'frequency') {
          if (updated.itemType === 'service') {
            const hasFreq = String(value || '').trim().length > 0;
            if (hasFreq) {
              const calc = calculateServiceWorkingDays(
                startDateStr,
                endDateStr,
                value,
                customerState
              );
              updated.qty = calc.billableDaysCount;
              updated.amount = Number((calc.billableDaysCount * updated.rate).toFixed(2));
              updated.calcBreakdown = calc;
              updated.isAutoCalculated = true;
            } else {
              updated.qty = 0;
              updated.amount = 0;
              updated.calcBreakdown = undefined;
              updated.isAutoCalculated = false;
            }
          }
        }

        return updated;
      })
    );
  };

  // Add a Service line item
  const handleAddService = (serviceItem?: ServiceCatalogItem) => {
    const selected = serviceItem || availableServices[0] || DEFAULT_SERVICES[0];
    const calc = calculateServiceWorkingDays(
      startDateStr,
      endDateStr,
      selected.defaultFrequency || 'Mon,Tue,Wed,Thu,Fri',
      customerState
    );

    const newLine: InvoiceLineDraft = {
      id: `line-srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemId: selected.itemId,
      itemName: selected.itemName,
      displayName: selected.description || selected.itemName,
      itemType: 'service',
      isFixedRate: false,
      frequency: selected.defaultFrequency || 'Mon,Tue,Wed,Thu,Fri',
      qty: calc.billableDaysCount,
      rate: selected.defaultRate,
      amount: Number((calc.billableDaysCount * selected.defaultRate).toFixed(2)),
      itemDetails: '',
      isAutoCalculated: true,
      calcBreakdown: calc
    };
    setLines(prev => [...prev, newLine]);
  };

  // Add an Extra / Ancillary line item
  const handleAddExtra = (extraItem?: ServiceCatalogItem) => {
    const selected = extraItem || availableExtras[0] || DEFAULT_EXTRAS[0];
    const isFixed = selected.isFixedRate ?? false;

    const newLine: InvoiceLineDraft = {
      id: `line-ext-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemId: selected.itemId,
      itemName: selected.itemName,
      displayName: selected.description || selected.itemName,
      itemType: 'extra',
      isFixedRate: isFixed,
      frequency: 'Adhoc',
      qty: 1,
      rate: selected.defaultRate,
      amount: Number(selected.defaultRate.toFixed(2)),
      itemDetails: '',
      isAutoCalculated: false
    };
    setLines(prev => [...prev, newLine]);
  };

  // Remove a line item
  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Cannot remove',
        description: 'An invoice must have at least one line item.'
      });
      return;
    }
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // Totals calculation
  const linesSubtotal = useMemo(() => {
    return lines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0);
  }, [lines]);

  const adminFeeTotal = useMemo(() => {
    if (!includeAdminFee) return 0;
    return (Number(adminFeeQty) || 1) * (Number(adminFeeRate) || 0);
  }, [includeAdminFee, adminFeeQty, adminFeeRate]);

  const invoiceGrandTotal = useMemo(() => {
    return Number((linesSubtotal + adminFeeTotal).toFixed(2));
  }, [linesSubtotal, adminFeeTotal]);

  // Submit invoice to NetSuite
  const handleSubmitInvoice = async () => {
    setErrorMessage(null);

    if (!customerId) {
      setErrorMessage('Could not resolve NetSuite Customer ID for this record.');
      return;
    }
    if (!franchiseeId) {
      setErrorMessage('Could not resolve NetSuite Franchisee ID for this record.');
      return;
    }
    if (!startDateStr || !endDateStr) {
      setErrorMessage('Please enter valid Start and End billing period dates.');
      return;
    }
    if (lines.length === 0) {
      setErrorMessage('Please add at least one line item.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        companyId: company.id,
        customerId: customerId.trim(),
        franchiseeId: franchiseeId.trim(),
        ...(customerPo.trim() ? { customerPo: customerPo.trim(), poNumber: customerPo.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(department.trim() ? { department: department.trim() } : {}),
        periodStartDate: startDateStr.trim(),
        periodEndDate: endDateStr.trim(),
        invoiceDate: invoiceDateStr,
        tranDate: invoiceDateStr,
        invoiceType: invoiceType,
        billingAddress: {
          name: billingName,
          companyName: billingName,
          poBox: billingPoBox,
          street: billingStreet1,
          street1: billingStreet1,
          street2: billingStreet2,
          suburb: billingSuburb,
          city: billingSuburb,
          state: billingState,
          postcode: billingPostcode,
          postalCode: billingPostcode,
          abn: billingAbn
        },
        companyAbn: billingAbn,
        lines: lines.map(l => ({
          qty: String(l.qty || 0),
          amount: Number(l.amount || 0).toFixed(2),
          itemId: String(l.itemId || '').trim(),
          itemName: String(l.itemName || '').trim(),
          rate: Number(l.rate || 0).toFixed(2),
          itemDetails: l.itemDetails || '',
          frequency: l.frequency || ''
        })),
        adminFeeRows: includeAdminFee
          ? [{ qty: String(adminFeeQty || 1), rate: Number(adminFeeRate).toFixed(2) }]
          : [],
        requestorUid: user?.uid,
        requestorName: userProfile?.displayName || userProfile?.name || 'Administrator',
        requestorRole: userProfile?.activeRole || 'Admin'
      };

      const res = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create invoice in NetSuite');
      }

      // Update local company.services in memory so next time user creates an invoice, it defaults to the selected frequency
      if (company) {
        if (!Array.isArray(company.services)) {
          (company as any).services = [];
        }
        lines.forEach(l => {
          const match = company.services?.find(s => (s.name || (s as any).service || '').toLowerCase() === l.itemName.toLowerCase());
          const freqArr = l.frequency ? (l.frequency.includes(',') ? l.frequency.split(',').map(s => s.trim()) : [l.frequency.trim()]) : [];
          if (match) {
            match.frequency = freqArr as any;
            match.rate = l.rate;
          } else if (l.itemName) {
            company.services?.push({
              name: l.itemName,
              frequency: freqArr as any,
              rate: l.rate
            });
          }
        });
      }

      toast({
        title: 'Invoice Created Successfully',
        description: `NetSuite Invoice #${data.invoiceId} generated and saved to company profile.`,
        className: 'bg-emerald-700 text-white'
      });

      if (onInvoiceCreated) {
        onInvoiceCreated(data.invoiceId);
      }

      onOpenChange(false);

    } catch (err: any) {
      console.error('[Create Invoice Modal Error]:', err);
      setErrorMessage(err?.message || 'Failed to generate invoice. Please review line items and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAddress = () => {
    const addr = (company as any)?.billingAddress || company?.address || (company as any)?.customerAddress || {};
    setBillingName(company?.companyName || (company as any)?.name || 'Valued Customer');
    setBillingPoBox((company as any)?.poBox || addr?.poBox || addr?.box || '');
    setBillingStreet1(addr?.street1 || addr?.street || (company as any)?.street || (company as any)?.address1 || '');
    setBillingStreet2(addr?.street2 || (company as any)?.address2 || '');
    setBillingSuburb(addr?.suburb || addr?.city || (company as any)?.suburb || (company as any)?.city || '');
    setBillingState(addr?.state || company?.state || 'NSW');
    setBillingPostcode(addr?.postcode || addr?.postalCode || (company as any)?.postcode || (company as any)?.postalCode || '');
    setBillingAbn(company?.abn || (company as any)?.custentity_abn || '');
    setIsEditingAddress(false);
    toast({
      title: 'Address Reset',
      description: 'Billing address restored to company default.'
    });
  };

  if (!hasAccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Access Restricted
            </DialogTitle>
            <DialogDescription>
              Invoice creation is currently restricted to Administrators and Superadmins.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Filtered items for popover search
  const filteredServices = availableServices.filter(s => 
    s.itemName.toLowerCase().includes(pickerSearchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(pickerSearchQuery.toLowerCase())
  );

  const filteredExtras = availableExtras.filter(e => 
    e.itemName.toLowerCase().includes(pickerSearchQuery.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(pickerSearchQuery.toLowerCase())
  );

  // Billing address resolution for live Tax Invoice document
  const resolvedBillingAddress = useMemo(() => {
    const cityStatePostcode = [
      (billingSuburb || '').toUpperCase(),
      (billingState || 'NSW').toUpperCase(),
      billingPostcode || ''
    ].filter(Boolean).join(' ');

    return {
      companyName: billingName || company.companyName || 'Valued Customer',
      poBox: billingPoBox,
      street1: billingStreet1,
      street2: billingStreet2,
      cityStatePostcode,
      abn: billingAbn
    };
  }, [billingName, billingPoBox, billingStreet1, billingStreet2, billingSuburb, billingState, billingPostcode, billingAbn, company.companyName]);

  // Invoice Date is always the end of month of the billing period
  const invoiceDateStr = useMemo(() => {
    if (endDateStr) {
      return endDateStr;
    }
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    return format(endOfMonth(prevMonth), 'dd/MM/yyyy');
  }, [endDateStr]);

  const invoiceDueDateStr = useMemo(() => {
    try {
      if (invoiceDateStr && invoiceDateStr.includes('/')) {
        const parts = invoiceDateStr.split('/').map(Number);
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
          return format(addDays(dateObj, 15), 'd/M/yyyy');
        }
      }
    } catch {}
    return format(addDays(new Date(), 15), 'd/M/yyyy');
  }, [invoiceDateStr]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[96vw] max-h-[94vh] overflow-y-auto p-4 sm:p-6 bg-slate-50">
        {/* Header */}
        <DialogHeader className="border-b border-slate-200 pb-3.5 bg-white -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 py-4 sm:px-6 rounded-t-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#095c7b]/10 rounded-xl text-[#095c7b]">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Create Customer Invoice
                  <Badge variant="outline" className="bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/30 font-semibold text-[11px]">
                    Option 1: Live Invoice Split-View
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Edit line items and frequencies on the left while live-previewing the official NetSuite Tax Invoice on the right.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingServices && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading services...</span>
                </div>
              )}
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-semibold px-2.5 py-1">
                State: {customerState}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* 2-Column Split-View: Left Form Editor, Right Live Invoice Document */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3">
          {/* ================= LEFT COLUMN: FORM EDITOR (7 Cols) ================= */}
          <div className="lg:col-span-7 space-y-4">
            {/* Card 1: Customer Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <Building2 className="w-4 h-4 text-[#095c7b]" />
                  Customer Information
                </div>
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                  Auto-synced
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Customer Name</Label>
                  <div className="text-xs font-bold text-slate-900 truncate mt-1 p-2 bg-slate-50 border border-slate-200 rounded-md">
                    {company.companyName || 'Valued Customer'}
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Customer PO#</Label>
                  <Input
                    value={customerPo}
                    onChange={e => setCustomerPo(e.target.value)}
                    placeholder="e.g. PO-98421"
                    className="h-8 text-xs mt-1 bg-white border-slate-300"
                  />
                </div>

                <div className="sm:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700">Location / Dept</Label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <Input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Loc"
                      className="h-8 text-xs bg-white border-slate-300"
                    />
                    <Input
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="Dept"
                      className="h-8 text-xs bg-white border-slate-300"
                    />
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Invoice Type</Label>
                    {isFranchiseeRole && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5" title="Locked for Franchisee role">
                        <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                      </span>
                    )}
                  </div>
                  {isFranchiseeRole ? (
                    <div className="relative flex items-center mt-1">
                      <Input
                        value={invoiceType}
                        disabled
                        className="h-8 text-xs font-bold bg-slate-100 text-slate-700 cursor-not-allowed pr-7 border-slate-300"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                    </div>
                  ) : (
                    <Select value={invoiceType} onValueChange={setInvoiceType}>
                      <SelectTrigger className="h-8 text-xs mt-1 bg-white border-slate-300 font-semibold">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Adhoc">Adhoc</SelectItem>
                        <SelectItem value="Consumables">Consumables</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Billing Address Selection & Override Section */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-[#095c7b]" />
                    <span>Billing Address on Invoice</span>
                    {billingState && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold bg-slate-50 border-slate-200">
                        {billingState}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Select Address Belonging to this Company */}
                    <Popover
                      open={isAddressPickerOpen}
                      onOpenChange={(isOpen) => {
                        setIsAddressPickerOpen(isOpen);
                        if (!isOpen) setAddressFilterQuery('');
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] px-2 gap-1 border-slate-300 text-[#095c7b] hover:bg-slate-50 font-medium"
                        >
                          <MapPin className="w-3 h-3 text-[#095c7b]" />
                          <span>Select Company Address ({companyAddresses.length})</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 sm:w-96 p-2.5 text-xs" align="end">
                        <div className="space-y-2">
                          <div className="font-semibold text-slate-800 flex items-center justify-between">
                            <span className="text-xs">Saved Company Addresses</span>
                            <span className="text-[10px] text-slate-500 font-normal truncate max-w-[150px]">
                              {company.companyName}
                            </span>
                          </div>

                          {companyAddresses.length > 3 && (
                            <div className="flex items-center border border-slate-200 rounded px-2 bg-slate-50">
                              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                              <Input
                                value={addressFilterQuery}
                                onChange={(e) => setAddressFilterQuery(e.target.value)}
                                placeholder="Filter company addresses & branches..."
                                className="h-7 border-0 bg-transparent text-xs focus-visible:ring-0 px-0 shadow-none"
                              />
                            </div>
                          )}

                          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                            {loadingCompanyAddresses ? (
                              <div className="flex items-center justify-center py-4 text-slate-400 text-xs gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Loading addresses...</span>
                              </div>
                            ) : companyAddresses.filter(addr => {
                                if (!addressFilterQuery.trim()) return true;
                                const q = addressFilterQuery.trim().toLowerCase();
                                const text = `${addr.label} ${addr.companyName} ${addr.street1} ${addr.suburb} ${addr.state} ${addr.postcode} ${addr.abn}`.toLowerCase();
                                return text.includes(q);
                              }).length > 0 ? (
                              companyAddresses
                                .filter(addr => {
                                  if (!addressFilterQuery.trim()) return true;
                                  const q = addressFilterQuery.trim().toLowerCase();
                                  const text = `${addr.label} ${addr.companyName} ${addr.street1} ${addr.suburb} ${addr.state} ${addr.postcode} ${addr.abn}`.toLowerCase();
                                  return text.includes(q);
                                })
                                .map((addrItem) => {
                                  const fullAddr = [addrItem.street1, addrItem.suburb, addrItem.state, addrItem.postcode]
                                    .filter(Boolean)
                                    .join(', ');
                                  return (
                                    <button
                                      key={addrItem.id}
                                      type="button"
                                      onClick={() => {
                                        setBillingName(addrItem.companyName);
                                        setBillingPoBox(addrItem.poBox || '');
                                        setBillingStreet1(addrItem.street1 || '');
                                        setBillingStreet2(addrItem.street2 || '');
                                        setBillingSuburb(addrItem.suburb || '');
                                        setBillingState(addrItem.state || 'NSW');
                                        setBillingPostcode(addrItem.postcode || '');
                                        if (addrItem.abn) setBillingAbn(addrItem.abn);
                                        setIsAddressPickerOpen(false);
                                        toast({
                                          title: 'Address Applied',
                                          description: `Applied ${addrItem.label}`
                                        });
                                      }}
                                      className="w-full text-left p-2 rounded-md hover:bg-[#095c7b]/10 border border-slate-100 hover:border-[#095c7b]/30 transition-all space-y-0.5 group"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-800 group-hover:text-[#095c7b] truncate">
                                          {addrItem.label}
                                        </span>
                                        {addrItem.isDefault && (
                                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                            Default
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-600 truncate">
                                        {fullAddr || 'No street address recorded'}
                                      </div>
                                      {addrItem.poBox && (
                                        <div className="text-[10px] text-slate-400 truncate">
                                          {addrItem.poBox}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })
                            ) : (
                              <div className="text-center py-3 text-slate-400 text-xs">
                                No matching addresses found for this company.
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      type="button"
                      size="sm"
                      variant={isEditingAddress ? 'secondary' : 'outline'}
                      onClick={() => setIsEditingAddress(!isEditingAddress)}
                      className="h-6 text-[11px] px-2 gap-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 className="w-3 h-3 text-[#095c7b]" />
                      <span>{isEditingAddress ? 'Done Editing' : 'Edit Fields'}</span>
                    </Button>

                    {isEditingAddress && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleResetAddress}
                        className="h-6 text-[11px] px-1.5 text-slate-400 hover:text-slate-700"
                        title="Reset to default company address"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Collapsible Address Editor Form */}
                {isEditingAddress ? (
                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 space-y-2.5 mt-1 animate-in fade-in-50 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[10px] font-medium text-slate-600">Billing Name / Attention</Label>
                        <Input
                          value={billingName}
                          onChange={e => setBillingName(e.target.value)}
                          placeholder="e.g. Taylors Wines - Accounts Payable"
                          className="h-7 text-xs mt-0.5 bg-white border-slate-300"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-slate-600">PO Box (Optional)</Label>
                        <Input
                          value={billingPoBox}
                          onChange={e => setBillingPoBox(e.target.value)}
                          placeholder="e.g. PO BOX 7418"
                          className="h-7 text-xs mt-0.5 bg-white border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-[10px] font-medium text-slate-600">Street Address Line 1</Label>
                        <Input
                          value={billingStreet1}
                          onChange={e => setBillingStreet1(e.target.value)}
                          placeholder="e.g. 10-12 Ralph St"
                          className="h-7 text-xs mt-0.5 bg-white border-slate-300"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-slate-600">Street Address Line 2 (Optional)</Label>
                        <Input
                          value={billingStreet2}
                          onChange={e => setBillingStreet2(e.target.value)}
                          placeholder="e.g. Level 2, Suite 4"
                          className="h-7 text-xs mt-0.5 bg-white border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2">
                        <Label className="text-[10px] font-medium text-slate-600">Suburb / City</Label>
                        <Input
                          value={billingSuburb}
                          onChange={e => setBillingSuburb(e.target.value)}
                          placeholder="e.g. Alexandria"
                          className="h-7 text-xs mt-0.5 bg-white border-slate-300"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-slate-600">State</Label>
                        <Input
                          value={billingState}
                          onChange={e => setBillingState(e.target.value.toUpperCase())}
                          placeholder="NSW"
                          className="h-7 text-xs font-bold mt-0.5 bg-white border-slate-300 uppercase"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-medium text-slate-600">Postcode</Label>
                        <Input
                          value={billingPostcode}
                          onChange={e => setBillingPostcode(e.target.value)}
                          placeholder="2015"
                          className="h-7 text-xs mt-0.5 bg-white border-slate-300"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <Label className="text-[10px] font-medium text-slate-600">Customer ABN (Optional - blank if unset)</Label>
                      <Input
                        value={billingAbn}
                        onChange={e => setBillingAbn(e.target.value)}
                        placeholder="e.g. 12 345 678 901"
                        className="h-7 text-xs mt-0.5 bg-white border-slate-300"
                      />
                    </div>
                  </div>
                ) : (
                  /* Compact Preview of Current Billing Address */
                  <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/70 text-xs flex items-center justify-between">
                    <div className="text-slate-700 truncate pr-2">
                      <strong className="text-slate-900 font-semibold">{resolvedBillingAddress.companyName}</strong>
                      {resolvedBillingAddress.poBox && <span className="text-slate-500"> &bull; {resolvedBillingAddress.poBox}</span>}
                      {resolvedBillingAddress.street1 && <span className="text-slate-500"> &bull; {resolvedBillingAddress.street1}</span>}
                      {resolvedBillingAddress.cityStatePostcode && <span className="text-slate-500"> &bull; {resolvedBillingAddress.cityStatePostcode}</span>}
                      {resolvedBillingAddress.abn && <span className="text-slate-500"> &bull; ABN: {resolvedBillingAddress.abn}</span>}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] bg-white border-slate-200 text-slate-600">
                      Live on Invoice
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Billing Period */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <Calendar className="w-4 h-4 text-[#095c7b]" />
                  Billing Period Range
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={periodPreset === 'lastMonth' ? 'default' : 'outline'}
                    onClick={() => setPresetDates('lastMonth')}
                    className={`h-7 text-xs ${periodPreset === 'lastMonth' ? 'bg-[#095c7b] text-white' : 'border-slate-300'}`}
                  >
                    Previous Month
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={periodPreset === 'thisMonth' ? 'default' : 'outline'}
                    onClick={() => setPresetDates('thisMonth')}
                    className={`h-7 text-xs ${periodPreset === 'thisMonth' ? 'bg-[#095c7b] text-white' : 'border-slate-300'}`}
                  >
                    Current Month
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={periodPreset === 'custom' ? 'default' : 'outline'}
                    onClick={() => setPeriodPreset('custom')}
                    className={`h-7 text-xs ${periodPreset === 'custom' ? 'bg-[#095c7b] text-white' : 'border-slate-300'}`}
                  >
                    Custom
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600">Start Date (DD/MM/YYYY)</Label>
                  <Input
                    value={startDateStr}
                    onChange={e => {
                      setStartDateStr(e.target.value);
                      setPeriodPreset('custom');
                    }}
                    placeholder="01/07/2026"
                    className="h-8 text-xs mt-1 border-slate-300"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">End Date (DD/MM/YYYY)</Label>
                  <Input
                    value={endDateStr}
                    onChange={e => {
                      setEndDateStr(e.target.value);
                      setPeriodPreset('custom');
                    }}
                    placeholder="31/07/2026"
                    className="h-8 text-xs mt-1 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Line Items Editor (High-Density Table View) */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Line Items ({lines.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    &bull; Interactive weekday schedule
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Dropdown for adding specific Services */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-slate-300 hover:bg-slate-100 text-[#095c7b] font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#095c7b]" />
                        Add Service
                        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto text-xs">
                      <DropdownMenuLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Services Catalog ({availableServices.length})
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableServices.map(srv => (
                        <DropdownMenuItem
                          key={srv.itemId + srv.itemName}
                          onClick={() => handleAddService(srv)}
                          className="cursor-pointer flex items-center justify-between py-1.5"
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-slate-800 block truncate">{srv.itemName}</span>
                            {srv.description && srv.description !== srv.itemName && (
                              <span className="text-[10px] text-slate-400 block truncate">{srv.description}</span>
                            )}
                          </div>
                          {srv.defaultRate > 0 && (
                            <span className="text-slate-500 shrink-0 font-medium">${srv.defaultRate.toFixed(2)}</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Dropdown for adding Extras */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-amber-300 hover:bg-amber-50 text-amber-800 font-semibold"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        Add Extra
                        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto text-xs">
                      <DropdownMenuLabel className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                        Extras & Ancillary ({availableExtras.length})
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableExtras.map(ext => (
                        <DropdownMenuItem
                          key={ext.itemId + ext.itemName}
                          onClick={() => handleAddExtra(ext)}
                          className="cursor-pointer flex items-center justify-between py-1.5"
                        >
                          <div className="flex items-center gap-1.5 truncate mr-2">
                            {ext.isFixedRate && (
                              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 block truncate">{ext.itemName}</span>
                              {ext.description && ext.description !== ext.itemName && (
                                <span className="text-[10px] text-slate-400 block truncate">{ext.description}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-slate-600 font-medium shrink-0">
                            {ext.defaultRate > 0 ? `$${ext.defaultRate.toFixed(2)}` : 'Custom'}
                            {ext.isFixedRate && <span className="text-[10px] text-slate-400 ml-1">(fixed)</span>}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Compact High-Density Table */}
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50/75">
                    <TableRow className="border-b border-slate-200">
                      <TableHead className="min-w-[190px] text-[11px] font-bold text-slate-700 py-2.5">
                        Item / Service
                      </TableHead>
                      <TableHead className="min-w-[240px] text-[11px] font-bold text-slate-700 py-2.5">
                        Schedule & Frequency
                      </TableHead>
                      <TableHead className="w-[75px] text-center text-[11px] font-bold text-slate-700 py-2.5">
                        Days (Qty)
                      </TableHead>
                      <TableHead className="w-[85px] text-right text-[11px] font-bold text-slate-700 py-2.5">
                        Rate ($)
                      </TableHead>
                      <TableHead className="w-[80px] text-right text-[11px] font-bold text-slate-700 py-2.5">
                        Amount ($)
                      </TableHead>
                      <TableHead className="w-[36px] text-center py-2.5"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const isService = line.itemType === 'service';
                      const norm = normalizeFrequencyDays(line.frequency);

                      return (
                        <TableRow key={line.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          {/* Column 1: Item & Memo */}
                          <TableCell className="py-2.5 align-top space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Badge 
                                variant="outline" 
                                className={isService ? "bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/30 font-semibold text-[9px] px-1 py-0 shrink-0" : "bg-amber-50 text-amber-800 border-amber-300 font-semibold text-[9px] px-1 py-0 shrink-0"}
                              >
                                {isService ? 'Service' : 'Extra'}
                              </Badge>
                              
                              <Popover
                                open={activePickerRowId === line.id}
                                onOpenChange={(isOpen) => {
                                  setActivePickerRowId(isOpen ? line.id : null);
                                  if (isOpen) setPickerSearchQuery('');
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-xs font-bold text-slate-800 hover:text-[#095c7b] flex items-center gap-1 max-w-[130px] truncate text-left group"
                                  >
                                    <span className="truncate">{line.itemName}</span>
                                    <ChevronsUpDown className="w-3 h-3 text-slate-400 group-hover:text-[#095c7b] shrink-0" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-2 text-xs" align="start">
                                  <div className="flex items-center border border-slate-200 rounded px-2 mb-2 bg-slate-50">
                                    <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                                    <Input
                                      value={pickerSearchQuery}
                                      onChange={(e) => setPickerSearchQuery(e.target.value)}
                                      placeholder="Search services or extras..."
                                      className="h-7 border-0 bg-transparent text-xs focus-visible:ring-0 px-0 shadow-none"
                                    />
                                  </div>

                                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                                    {filteredServices.length > 0 && (
                                      <div>
                                        <div className="text-[10px] font-bold text-[#095c7b] uppercase tracking-wider px-1 py-0.5">
                                          Services ({filteredServices.length})
                                        </div>
                                        <div className="space-y-0.5 mt-0.5">
                                          {filteredServices.map((srv) => (
                                            <button
                                              key={srv.itemId + srv.itemName}
                                              type="button"
                                              onClick={() => handleSelectItem(line.id, srv)}
                                              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between hover:bg-slate-100 transition-colors ${
                                                line.itemName === srv.itemName ? 'bg-[#095c7b]/10 text-[#095c7b] font-semibold' : 'text-slate-700'
                                              }`}
                                            >
                                              <span className="truncate mr-2">{srv.itemName}</span>
                                              {srv.defaultRate > 0 && (
                                                <span className="text-slate-400 text-[11px] shrink-0">${srv.defaultRate.toFixed(2)}</span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {filteredExtras.length > 0 && (
                                      <div>
                                        <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider px-1 py-0.5 mt-1.5">
                                          Extras & Ancillary ({filteredExtras.length})
                                        </div>
                                        <div className="space-y-0.5 mt-0.5">
                                          {filteredExtras.map((ext) => (
                                            <button
                                              key={ext.itemId + ext.itemName}
                                              type="button"
                                              onClick={() => handleSelectItem(line.id, ext)}
                                              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between hover:bg-amber-50/60 transition-colors ${
                                                line.itemName === ext.itemName ? 'bg-amber-100 text-amber-900 font-semibold' : 'text-slate-700'
                                              }`}
                                            >
                                              <div className="flex items-center gap-1.5 truncate mr-2">
                                                {ext.isFixedRate && (
                                                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                                )}
                                                <span className="truncate">{ext.itemName}</span>
                                              </div>
                                              <span className="text-slate-500 text-[11px] shrink-0">
                                                {ext.defaultRate > 0 ? `$${ext.defaultRate.toFixed(2)}` : 'Custom'}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            <Input
                              value={line.itemDetails}
                              onChange={e => updateLine(line.id, 'itemDetails', e.target.value)}
                              placeholder="Memo / description (optional)"
                              className="h-6 text-[11px] bg-slate-50/60 border-slate-200 placeholder:text-slate-400"
                            />
                          </TableCell>

                          {/* Column 2: Schedule & Weekday Pills */}
                          <TableCell className="py-2.5 align-top">
                            {isService ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1">
                                  {/* Weekday Toggle Pills: M, T, W, T, F */}
                                  {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map((day, idx) => {
                                    const isSelected = Array.isArray(norm) && norm.includes(day);
                                    const dayInitial = ['M', 'T', 'W', 'T', 'F'][idx];
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleWeekdayInFrequency(line.id, day)}
                                        title={`Toggle ${day}`}
                                        className={`w-5 h-5 rounded text-[10px] font-bold transition-all ${
                                          isSelected
                                            ? 'bg-[#095c7b] text-white shadow-xs'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
                                        }`}
                                      >
                                        {dayInitial}
                                      </button>
                                    );
                                  })}

                                  {/* Quick Preset Dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1.5 text-[10px] font-medium text-[#095c7b] hover:bg-[#095c7b]/10 gap-0.5"
                                        title="Quick presets"
                                      >
                                        <span>Presets</span>
                                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-48 text-xs">
                                      <DropdownMenuLabel className="text-[10px] font-bold text-slate-500 uppercase">
                                        Frequency Presets
                                      </DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => updateLine(line.id, 'frequency', 'Mon,Tue,Wed,Thu,Fri')}>
                                        ⚡ Daily (Mon-Fri)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateLine(line.id, 'frequency', 'Mon,Wed,Fri')}>
                                        📅 3 Days (Mon, Wed, Fri)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateLine(line.id, 'frequency', 'Tue,Thu')}>
                                        📅 2 Days (Tue, Thu)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateLine(line.id, 'frequency', 'Mon,Thu')}>
                                        📅 2 Days (Mon, Thu)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => updateLine(line.id, 'frequency', 'Wed')}>
                                        📅 1 Day (Wed)
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => updateLine(line.id, 'frequency', '')} className="text-slate-500">
                                        🚫 Clear / Blank
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {/* Holiday Deduction Badge */}
                                {line.calcBreakdown && line.calcBreakdown.excludedHolidays.length > 0 && (
                                  <div 
                                    className="text-[9px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded inline-block truncate max-w-full"
                                    title={line.calcBreakdown.excludedHolidays.map(h => `${h.name} (${h.date})`).join(', ')}
                                  >
                                    ⚡ -{line.calcBreakdown.excludedHolidays.length} {customerState} holiday(s) deducted
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="pt-0.5">
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-normal">
                                  Adhoc / Ancillary
                                </Badge>
                              </div>
                            )}
                          </TableCell>

                          {/* Column 3: Days (Qty) */}
                          <TableCell className="py-2.5 align-top text-center">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={line.qty === 0 && !line.frequency ? '' : (line.qty || '')}
                              onChange={e => updateLine(line.id, 'qty', e.target.value)}
                              placeholder={!line.frequency ? '' : '0'}
                              className="h-6 w-14 text-xs font-bold text-center bg-white border-slate-300 mx-auto"
                            />
                          </TableCell>

                          {/* Column 4: Rate ($) */}
                          <TableCell className="py-2.5 align-top text-right">
                            {line.isFixedRate ? (
                              <div className="relative inline-flex items-center">
                                <Input
                                  type="number"
                                  value={line.rate.toFixed(2)}
                                  disabled
                                  className="h-6 w-16 text-xs text-right bg-slate-100 text-slate-700 font-bold cursor-not-allowed pr-4 border-slate-300"
                                />
                                <Lock className="w-2.5 h-2.5 text-slate-400 absolute right-1 pointer-events-none" />
                              </div>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.rate}
                                onChange={e => updateLine(line.id, 'rate', e.target.value)}
                                className="h-6 w-16 text-xs text-right font-bold bg-white border-slate-300 ml-auto"
                              />
                            )}
                          </TableCell>

                          {/* Column 5: Amount ($) */}
                          <TableCell className="py-2.5 align-top text-right">
                            <span className="text-xs font-bold text-slate-900 block pt-1">
                              ${line.amount.toFixed(2)}
                            </span>
                          </TableCell>

                          {/* Column 6: Delete action */}
                          <TableCell className="py-2.5 align-top text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(line.id)}
                              className="h-6 w-6 text-slate-400 hover:text-red-600"
                              title="Remove item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Card 4: Admin Fee */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="adminFeeCheck"
                  checked={includeAdminFee}
                  onCheckedChange={checked => setIncludeAdminFee(Boolean(checked))}
                />
                <label htmlFor="adminFeeCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Include Account Administration Fee
                </label>
              </div>

              {includeAdminFee && (
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Qty:</span>
                    <Input
                      type="number"
                      min="1"
                      value={adminFeeQty}
                      onChange={e => setAdminFeeQty(Number(e.target.value || 1))}
                      className="h-7 w-12 text-xs text-center font-semibold bg-white border-slate-300"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">Rate: $</span>
                    <Input
                      type="number"
                      value={adminFeeRate.toFixed(2)}
                      disabled
                      className="h-7 w-14 text-xs text-right bg-slate-100 text-slate-700 font-bold cursor-not-allowed border-slate-300"
                    />
                    <Lock className="w-3 h-3 text-slate-400 -ml-0.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    = ${adminFeeTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================= RIGHT COLUMN: LIVE NETSUITE TAX INVOICE PREVIEW (5 Cols) ================= */}
          <div className="lg:col-span-5">
            <div className="sticky top-2 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                  <Eye className="w-4 h-4 text-[#095c7b]" />
                  Live Tax Invoice Preview
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-semibold">
                  Live NetSuite Sync
                </Badge>
              </div>

              {/* Realistic NetSuite Tax Invoice Document */}
              <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-sm text-xs space-y-4 font-sans text-slate-800">
                {/* Header Logo & Tax Invoice title */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    {/* MailPlus Logo Badge */}
                    <div className="inline-flex items-center bg-[#4a4f54] text-[#fcd34d] px-2.5 py-1 rounded">
                      <span className="font-black text-sm tracking-tight text-[#fcd34d]">mail</span>
                      <span className="font-bold text-sm tracking-tight text-white ml-0.5">plus</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-light text-slate-800 tracking-tight">Tax Invoice</h2>
                    <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Draft Preview
                    </span>
                  </div>
                </div>

                {/* Bill To & Invoice Info Block */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Bill To with Realistic Formatted Address */}
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Bill To
                    </div>
                    <div className="font-bold text-slate-900 text-xs leading-tight">
                      {resolvedBillingAddress.companyName}
                    </div>
                    {resolvedBillingAddress.poBox && (
                      <div className="text-[11px] text-slate-700 font-medium leading-tight">
                        {resolvedBillingAddress.poBox}
                      </div>
                    )}
                    {resolvedBillingAddress.street1 && (
                      <div className="text-[11px] text-slate-600 leading-tight">
                        {resolvedBillingAddress.street1}
                      </div>
                    )}
                    {resolvedBillingAddress.street2 && (
                      <div className="text-[11px] text-slate-600 leading-tight">
                        {resolvedBillingAddress.street2}
                      </div>
                    )}
                    {resolvedBillingAddress.cityStatePostcode && (
                      <div className="text-[11px] text-slate-600 leading-tight">
                        {resolvedBillingAddress.cityStatePostcode}
                      </div>
                    )}
                    {customerPo && (
                      <div className="text-[10px] text-[#095c7b] font-semibold mt-1">
                        PO#: {customerPo}
                      </div>
                    )}
                  </div>

                  {/* Invoice Details Block */}
                  <div className="text-right space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">
                      Invoice #: <span className="font-mono text-slate-500">[Pending Submit]</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Date: <strong className="text-slate-800">{invoiceDateStr}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Due Date: <strong className="text-slate-800">{invoiceDueDateStr}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Type: <strong className="text-slate-800">{invoiceType}</strong>
                    </div>
                    {resolvedBillingAddress.abn ? (
                      <div className="text-[11px] text-slate-600">
                        ABN: <strong className="text-slate-800">{resolvedBillingAddress.abn}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Terms Strip */}
                <div className="grid grid-cols-3 bg-[#e9ecef]/80 border border-slate-200 rounded px-2.5 py-1.5 text-center text-[10px]">
                  <div>
                    <span className="text-slate-500 font-semibold block">Terms</span>
                    <span className="font-bold text-slate-800">Net 15 Days</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Period</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {startDateStr && endDateStr ? `${startDateStr.slice(0, 5)} - ${endDateStr.slice(0, 5)}` : 'Month'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">State</span>
                    <span className="font-bold text-slate-800">{customerState}</span>
                  </div>
                </div>

                {/* Live Items Table */}
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#4a4f54] text-white text-[10px] uppercase">
                      <tr>
                        <th className="py-1.5 px-2 font-semibold">Description</th>
                        <th className="py-1.5 px-1.5 text-center font-semibold w-10">Qty</th>
                        <th className="py-1.5 px-1.5 text-right font-semibold w-14">Rate</th>
                        <th className="py-1.5 px-2 text-right font-semibold w-16">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {lines.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/80">
                          <td className="py-1.5 px-2">
                            <div className="font-bold text-slate-900 leading-tight">{l.itemName}</div>
                            {l.itemDetails && (
                              <div className="text-[10px] text-slate-500 leading-tight">{l.itemDetails}</div>
                            )}
                            {l.itemType === 'service' && l.frequency && (
                              <div className="text-[9px] text-[#095c7b] font-medium leading-tight">
                                Frequency: {l.frequency} {l.calcBreakdown ? `(${l.calcBreakdown.billableDaysCount} working days)` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-1.5 text-center font-semibold text-slate-800 align-top">
                            {l.qty || 0}
                          </td>
                          <td className="py-1.5 px-1.5 text-right text-slate-600 align-top">
                            ${Number(l.rate || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-900 align-top">
                            ${Number(l.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}

                      {includeAdminFee && (
                        <tr className="bg-slate-50/50">
                          <td className="py-1.5 px-2">
                            <div className="font-bold text-slate-900 leading-tight">Account Administration Fee</div>
                            <div className="text-[9px] text-slate-500 leading-tight">Standard monthly processing</div>
                          </td>
                          <td className="py-1.5 px-1.5 text-center font-semibold text-slate-800 align-top">
                            {adminFeeQty}
                          </td>
                          <td className="py-1.5 px-1.5 text-right text-slate-600 align-top">
                            ${adminFeeRate.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-900 align-top">
                            ${adminFeeTotal.toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal, GST & Total */}
                <div className="flex justify-end pt-1">
                  <div className="w-56 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-800">${invoiceGrandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST (10%):</span>
                      <span className="font-semibold text-slate-800">${(invoiceGrandTotal * 0.10).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-slate-900 text-sm">
                      <span>Total (Inc GST):</span>
                      <span className="text-[#095c7b] font-black">${(invoiceGrandTotal * 1.10).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* MailPlus Remittance Box */}
                <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700 uppercase tracking-wider">
                    Remittance &amp; Direct Deposit
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-slate-50 p-2 rounded border border-slate-200 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">Bank:</span>
                      <strong className="text-slate-700">Commonwealth Bank</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Account Name:</span>
                      <strong className="text-slate-700">Mailplus Pty Ltd</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">BSB:</span>
                      <strong className="text-slate-700">062 000</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Account:</span>
                      <strong className="text-slate-700">1501 8863</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button inside sticky card */}
              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  onClick={handleSubmitInvoice}
                  disabled={submitting || lines.length === 0}
                  className="w-full h-10 bg-[#095c7b] hover:bg-[#07475f] text-white font-bold gap-2 shadow-sm text-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting to NetSuite...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Submit Invoice (${(invoiceGrandTotal * 1.10).toFixed(2)} AUD)
                    </>
                  )}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                    className="text-xs text-slate-500 hover:text-slate-800 h-7"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
