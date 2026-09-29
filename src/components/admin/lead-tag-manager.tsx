'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader } from '@/components/ui/loader';
import { CustomBulkSelectControl } from '@/components/ui/custom-bulk-select-control';
import { getLeadsFromFirebase, logActivity, getLeadOrCompanyCollection } from '@/services/firebase';
import type { Lead, LeadStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  Search, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Tag as TagIcon,
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  CheckSquare,
  Square,
  ListChecks,
  X,
  Plus,
  Edit2,
  Trash2,
  Building,
  Store,
  Phone,
  Layers,
  Sparkles,
  Settings2,
  Check
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn, parseDateString, safeFormatDate, getLeadDisplayDateValue } from '@/lib/utils';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getLeadInitialBucket } from '@/lib/lead-stage-analytics';

export interface TagDefinition {
  id: string;
  name: string;
  description: string;
  color?: string; // 'slate' | 'amber' | 'purple' | 'blue' | 'emerald' | 'rose' | 'indigo' | 'cyan'
  isSystem?: boolean;
}

const DEFAULT_SYSTEM_TAGS: TagDefinition[] = [
  {
    id: 'BAU',
    name: 'BAU',
    description: 'Standard business-as-usual single site account',
    color: 'slate',
    isSystem: true,
  },
  {
    id: 'J2',
    name: 'J2',
    description: 'Outbound campaign and cold-calling generated account',
    color: 'amber',
    isSystem: true,
  },
  {
    id: 'Corporate / Multisite',
    name: 'Corporate / Multisite',
    description: 'Corporate head-office billing or multi-branch network account',
    color: 'purple',
    isSystem: true,
  },
];

const COLOR_OPTIONS = [
  { value: 'slate', label: 'Slate Gray', class: 'bg-slate-100 text-slate-800 border-slate-200' },
  { value: 'amber', label: 'Amber / Orange', class: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'emerald', label: 'Emerald Green', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'rose', label: 'Rose Red', class: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'cyan', label: 'Cyan / Teal', class: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
];

export function resolveLeadTag(lead: Lead): string {
  if (
    lead.accountType === 'Corporate / Multisite' ||
    lead.accountType === 'Corporate' ||
    lead.accountType === 'Multisite' ||
    lead.selectedServiceOption === 'corporate' ||
    lead.bucket === 'multisite' ||
    lead.isParentLead ||
    lead.isChildLead ||
    !!lead.parentLeadId
  ) {
    return 'Corporate / Multisite';
  }
  if (lead.accountType === 'J2') {
    return 'J2';
  }
  if (lead.accountType === 'BAU' || lead.accountType === 'Standard') {
    return 'BAU';
  }
  if (lead.accountType && lead.accountType.trim() !== '') {
    return lead.accountType.trim();
  }

  const isOutbound = 
    lead.wasOutbound === true || 
    lead.originalBucket?.toLowerCase() === 'outbound' || 
    lead.bucket?.toLowerCase() === 'outbound' || 
    !!lead.dialerAssigned || 
    getLeadInitialBucket(lead) === 'Outbound';

  if (isOutbound) {
    return 'J2';
  }

  return 'BAU';
}

export function LeadTagManager() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'leads' | 'definitions'>('leads');
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<TagDefinition[]>(DEFAULT_SYSTEM_TAGS);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [bucketFilter, setBucketFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [amFilter, setAmFilter] = useState<string[]>([]);
  const [dialerFilter, setDialerFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(100);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Bulk Operations State
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkTargetTag, setBulkTargetTag] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ current: number; total: number } | null>(null);

  // Tag Management Dialog State
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  const [tagNameInput, setTagNameInput] = useState('');
  const [tagDescInput, setTagDescInput] = useState('');
  const [tagColorInput, setTagColorInput] = useState('slate');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch Tags Definition from Firestore
  const fetchTagDefinitions = async () => {
    try {
      const tagDocRef = doc(firestore, 'system_settings', 'lead_tags');
      const snap = await getDoc(tagDocRef);
      if (snap.exists() && snap.data()?.customTags) {
        const custom: TagDefinition[] = snap.data().customTags;
        // Merge system tags with custom tags, avoiding duplicates
        const systemIds = new Set(DEFAULT_SYSTEM_TAGS.map(t => t.id));
        const filteredCustom = custom.filter(c => !systemIds.has(c.id));
        setTags([...DEFAULT_SYSTEM_TAGS, ...filteredCustom]);
      } else {
        setTags(DEFAULT_SYSTEM_TAGS);
      }
    } catch (err) {
      console.error('Failed to load custom tag definitions:', err);
      setTags(DEFAULT_SYSTEM_TAGS);
    }
  };

  // Fetch Leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeadsFromFirebase({ summary: true });
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch leads for tag manager:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch leads.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTagDefinitions();
    fetchLeads();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('');
  }, [debouncedSearchTerm, tagFilter, bucketFilter, statusFilter, amFilter, dialerFilter, dateRange, pageSize]);

  // Save Custom Tags to Firestore
  const saveCustomTags = async (updatedTags: TagDefinition[]) => {
    try {
      const customOnly = updatedTags.filter(t => !t.isSystem);
      const tagDocRef = doc(firestore, 'system_settings', 'lead_tags');
      await setDoc(tagDocRef, {
        customTags: customOnly,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || userProfile?.displayName || 'Admin'
      }, { merge: true });
    } catch (err) {
      console.error('Failed to save tag definitions to Firestore:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to persist custom tag definition to database.'
      });
    }
  };

  const handleOpenNewTagDialog = () => {
    setEditingTag(null);
    setTagNameInput('');
    setTagDescInput('');
    setTagColorInput('slate');
    setIsTagDialogOpen(true);
  };

  const handleOpenEditTagDialog = (tag: TagDefinition) => {
    setEditingTag(tag);
    setTagNameInput(tag.name);
    setTagDescInput(tag.description);
    setTagColorInput(tag.color || 'slate');
    setIsTagDialogOpen(true);
  };

  const handleSaveTag = async () => {
    const trimmedName = tagNameInput.trim();
    if (!trimmedName) {
      toast({ variant: 'destructive', title: 'Invalid Name', description: 'Tag name cannot be empty.' });
      return;
    }

    let updatedTags: TagDefinition[];

    if (editingTag) {
      // Editing existing tag
      updatedTags = tags.map(t => {
        if (t.id === editingTag.id) {
          return {
            ...t,
            name: trimmedName,
            description: tagDescInput.trim(),
            color: tagColorInput,
          };
        }
        return t;
      });
      toast({ title: 'Tag Updated', description: `Tag "${trimmedName}" was successfully updated.` });
    } else {
      // Check duplicate
      if (tags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Duplicate Tag', description: 'A tag with this name already exists.' });
        return;
      }

      const newTag: TagDefinition = {
        id: trimmedName,
        name: trimmedName,
        description: tagDescInput.trim() || 'Custom user classification tag',
        color: tagColorInput,
        isSystem: false,
      };
      updatedTags = [...tags, newTag];
      toast({ title: 'Tag Created', description: `New tag "${trimmedName}" has been added.` });
    }

    setTags(updatedTags);
    await saveCustomTags(updatedTags);
    setIsTagDialogOpen(false);
  };

  const handleDeleteTag = async (tagToDelete: TagDefinition) => {
    if (tagToDelete.isSystem) {
      toast({ variant: 'destructive', title: 'System Tag', description: 'Core system tags cannot be deleted.' });
      return;
    }
    const updatedTags = tags.filter(t => t.id !== tagToDelete.id);
    setTags(updatedTags);
    await saveCustomTags(updatedTags);
    toast({ title: 'Tag Deleted', description: `Tag "${tagToDelete.name}" was removed.` });
  };

  // Lead Counts by Tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tags.forEach(t => { counts[t.name] = 0; });
    items.forEach(item => {
      const resolved = resolveLeadTag(item);
      counts[resolved] = (counts[resolved] || 0) + 1;
    });
    return counts;
  }, [items, tags]);

  // Unique Filter Options
  const uniqueBuckets = useMemo(() => {
    const buckets = new Set(items.map(item => item.bucket).filter(Boolean));
    const list = Array.from(buckets).map(b => ({
      value: b!,
      label: b === 'field_sales' ? 'Field Sales' : b!.charAt(0).toUpperCase() + b!.slice(1)
    })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'None / No Bucket' }];
  }, [items]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(items.map(item => item.customerStatus || item.status).filter(Boolean));
    return Array.from(statuses).map(s => ({ value: s!, label: s! })).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const uniqueAMs = useMemo(() => {
    const ams = new Set(items.map(item => item.accountManagerAssigned).filter(Boolean));
    const list = Array.from(ams).map(am => ({ value: am!, label: am! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const uniqueDialers = useMemo(() => {
    const dialers = new Set(items.map(item => item.dialerAssigned).filter(Boolean));
    const list = Array.from(dialers).map(d => ({ value: d!, label: d! })).sort((a, b) => a.label.localeCompare(b.label));
    return [...list, { value: 'none', label: 'Unassigned' }];
  }, [items]);

  const tagOptions: Option[] = useMemo(() => {
    return tags.map(t => ({ value: t.name, label: t.name }));
  }, [tags]);

  // Filtered Leads
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Search filter
      if (debouncedSearchTerm) {
        const query = debouncedSearchTerm.toLowerCase();
        const matchesName = item.companyName?.toLowerCase().includes(query);
        const matchesId = item.id?.toLowerCase().includes(query);
        const matchesPhone = item.customerPhone?.toLowerCase().includes(query);
        const matchesEmail = item.customerServiceEmail?.toLowerCase().includes(query);
        const matchesAbn = item.abn?.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesPhone && !matchesEmail && !matchesAbn) return false;
      }

      // 2. Tag / AccountType filter
      if (tagFilter.length > 0) {
        const itemTag = resolveLeadTag(item);
        if (!tagFilter.includes(itemTag)) return false;
      }

      // 3. Bucket filter
      if (bucketFilter.length > 0) {
        const itemBucket = item.bucket || 'none';
        if (!bucketFilter.includes(itemBucket)) return false;
      }

      // 4. Status filter
      if (statusFilter.length > 0) {
        const itemStatus = item.customerStatus || item.status || '';
        if (!statusFilter.includes(itemStatus)) return false;
      }

      // 5. AM filter
      if (amFilter.length > 0) {
        const itemAM = item.accountManagerAssigned || 'none';
        if (!amFilter.includes(itemAM)) return false;
      }

      // 6. Dialer filter
      if (dialerFilter.length > 0) {
        const itemDialer = item.dialerAssigned || 'none';
        if (!dialerFilter.includes(itemDialer)) return false;
      }

      // 7. Date Range Filter
      if (dateRange?.from) {
        const dateVal = getLeadDisplayDateValue(item) || item.dateLeadEntered || (item as any).createdAt;
        if (!dateVal) return false;
        const itemDate = parseDateString(dateVal);
        if (!itemDate) return false;

        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      return true;
    });
  }, [items, debouncedSearchTerm, tagFilter, bucketFilter, statusFilter, amFilter, dialerFilter, dateRange]);

  // Pagination Math
  const totalItems = filteredItems.length;
  const isAllPages = pageSize === 'all';
  const effectivePageSize = isAllPages ? (totalItems || 1) : pageSize;
  const totalPages = isAllPages ? 1 : Math.max(1, Math.ceil(totalItems / effectivePageSize));

  const paginatedItems = useMemo(() => {
    if (isAllPages) return filteredItems;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredItems.slice(start, start + effectivePageSize);
  }, [filteredItems, currentPage, effectivePageSize, isAllPages]);

  // Bulk Selection Handlers
  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedItems.map(item => item.id);
    const allSelected = pageIds.every(id => selectedItems.includes(id));
    if (allSelected) {
      setSelectedItems(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedItems(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedItems(filteredItems.map(i => i.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleToggleRow = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Single Lead Tag Update
  const handleSingleTagUpdate = async (lead: Lead, targetTag: string) => {
    try {
      const collectionName = await getLeadOrCompanyCollection(lead.id, lead);
      const isCorpOrMulti = targetTag === 'Corporate / Multisite';

      await updateDoc(doc(firestore, collectionName, lead.id), {
        accountType: targetTag,
        ...(isCorpOrMulti ? { selectedServiceOption: 'corporate' } : {}),
        updatedAt: new Date()
      });

      await logActivity(lead.id, {
        type: 'Update',
        notes: `Account classification tag changed to "${targetTag}" via Data Management`,
        author: user?.displayName || userProfile?.displayName || 'Admin'
      });

      setItems(prev => prev.map(item => item.id === lead.id ? { ...item, accountType: targetTag } : item));
      toast({
        title: 'Tag Updated',
        description: `Successfully tagged "${lead.companyName}" as ${targetTag}.`,
      });
    } catch (err: any) {
      console.error('Failed to update lead tag:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Failed to update lead tag.'
      });
    }
  };

  // Bulk Tag Update
  const handleBulkTagUpdate = async () => {
    if (selectedItems.length === 0 || !bulkTargetTag) return;
    setUpdating(true);
    setUpdateProgress({ current: 0, total: selectedItems.length });

    const CHUNK_SIZE = 40;
    const selectedSet = new Set(selectedItems);
    let completedCount = 0;
    const isCorpOrMulti = bulkTargetTag === 'Corporate / Multisite';

    try {
      for (let i = 0; i < selectedItems.length; i += CHUNK_SIZE) {
        const chunk = selectedItems.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (leadId) => {
            const currentItem = items.find(it => it.id === leadId);
            const collectionName = await getLeadOrCompanyCollection(leadId, currentItem);
            await updateDoc(doc(firestore, collectionName, leadId), {
              accountType: bulkTargetTag,
              ...(isCorpOrMulti ? { selectedServiceOption: 'corporate' } : {}),
              updatedAt: new Date()
            });

            await logActivity(leadId, {
              type: 'Update',
              notes: `Account classification tag updated to "${bulkTargetTag}" via Data Management bulk update`,
              author: user?.displayName || userProfile?.displayName || 'Admin'
            });
          })
        );
        completedCount += chunk.length;
        setUpdateProgress({ current: completedCount, total: selectedItems.length });
      }

      setItems(prev =>
        prev.map(item =>
          selectedSet.has(item.id) ? { ...item, accountType: bulkTargetTag } : item
        )
      );

      toast({
        title: 'Bulk Tagging Complete',
        description: `Successfully updated ${selectedItems.length.toLocaleString()} lead(s) to "${bulkTargetTag}".`,
      });
      setSelectedItems([]);
      setBulkTargetTag('');
    } catch (err) {
      console.error('Bulk tag update failed:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete bulk tagging for all selected leads.'
      });
    } finally {
      setUpdating(false);
      setUpdateProgress(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTagFilter([]);
    setBucketFilter([]);
    setStatusFilter([]);
    setAmFilter([]);
    setDialerFilter([]);
    setDateRange(undefined);
  };

  const renderTagBadge = (tagName: string) => {
    const found = tags.find(t => t.name === tagName);
    const colorKey = found?.color || (tagName === 'Corporate / Multisite' ? 'purple' : tagName === 'J2' ? 'amber' : 'slate');

    if (tagName === 'Corporate / Multisite') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[11px] font-semibold flex items-center gap-1 w-fit">
          <Building className="w-3 h-3" /> Corporate / Multisite
        </Badge>
      );
    }
    if (tagName === 'J2') {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px] font-semibold flex items-center gap-1 w-fit">
          <Phone className="w-3 h-3" /> J2
        </Badge>
      );
    }
    if (tagName === 'BAU') {
      return (
        <Badge variant="outline" className="text-slate-600 border-slate-200 text-[11px] flex items-center gap-1 w-fit">
          <Store className="w-3 h-3" /> BAU
        </Badge>
      );
    }

    const colorConfig = COLOR_OPTIONS.find(c => c.value === colorKey);
    return (
      <Badge className={cn("text-[11px] font-medium border flex items-center gap-1 w-fit", colorConfig ? colorConfig.class : "bg-slate-100 text-slate-800 border-slate-200")}>
        <TagIcon className="w-3 h-3" /> {tagName}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Lead Tagging & Bulk Updater
            </TabsTrigger>
            <TabsTrigger value="definitions" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Tag Definitions & Settings
            </TabsTrigger>
          </TabsList>

          {activeTab === 'definitions' && (
            <Button onClick={handleOpenNewTagDialog} size="sm" className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white gap-1.5 shadow-xs">
              <Plus className="w-4 h-4" />
              Add New Tag
            </Button>
          )}
        </div>

        {/* TAB 1: LEAD TAGGING & BULK UPDATER */}
        <TabsContent value="leads" className="space-y-6 mt-4">
          {/* Quick Tag Summary Badges */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-lg border border-border/50">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Current Tag Distribution:</span>
            {tags.map(tag => {
              const count = tagCounts[tag.name] || 0;
              const isFiltered = tagFilter.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    setTagFilter(prev =>
                      prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                    );
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                    isFiltered 
                      ? "bg-[#095c7b] text-white border-[#095c7b] shadow-xs" 
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <span>{tag.name}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    isFiltered ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}>
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Leads</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Company, phone, email, ABN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Filter by Tag */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Tag</label>
              <MultiSelectCombobox
                options={tagOptions}
                selected={tagFilter}
                onSelectedChange={setTagFilter}
                placeholder="All Account Tags"
              />
            </div>

            {/* Filter by Bucket */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bucket</label>
              <MultiSelectCombobox
                options={uniqueBuckets}
                selected={bucketFilter}
                onSelectedChange={setBucketFilter}
                placeholder="All Buckets"
              />
            </div>

            {/* Filter by Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <MultiSelectCombobox
                options={uniqueStatuses}
                selected={statusFilter}
                onSelectedChange={setStatusFilter}
                placeholder="All Statuses"
              />
            </div>

            {/* Filter by AM */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Manager</label>
              <MultiSelectCombobox
                options={uniqueAMs}
                selected={amFilter}
                onSelectedChange={setAmFilter}
                placeholder="All Account Managers"
              />
            </div>

            {/* Date Range Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Entered</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-xs border-input bg-card",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
                      ) : (
                        format(dateRange.from, 'dd/MM/yy')
                      )
                    ) : (
                      "All Dates"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active Filter Badges & Clear */}
          {(searchTerm || tagFilter.length > 0 || bucketFilter.length > 0 || statusFilter.length > 0 || amFilter.length > 0 || dialerFilter.length > 0 || dateRange) && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Filter className="w-3.5 h-3.5 text-[#095c7b]" />
                <span>Showing {totalItems.toLocaleString()} matching lead(s) out of {items.length.toLocaleString()} total</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </Button>
            </div>
          )}

          {/* Bulk Operations Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <CustomBulkSelectControl
                allAvailableIds={filteredItems.map(i => i.id)}
                selectedIds={selectedItems}
                onSelect={(ids) => setSelectedItems(ids)}
                onClear={handleDeselectAll}
                label="Leads"
                compact
              />

              <span className="text-xs text-muted-foreground">
                <strong className="text-foreground">{selectedItems.length.toLocaleString()}</strong> of {totalItems.toLocaleString()} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select value={bulkTargetTag} onValueChange={setBulkTargetTag} disabled={selectedItems.length === 0 || updating}>
                <SelectTrigger className="w-[200px] h-9 text-xs bg-white dark:bg-slate-950">
                  <SelectValue placeholder="Select target tag..." />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.name} className="text-xs">
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleBulkTagUpdate}
                disabled={selectedItems.length === 0 || !bulkTargetTag || updating}
                size="sm"
                className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white h-9 text-xs font-semibold px-4"
              >
                {updating ? (
                  <>
                    <Loader className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <TagIcon className="mr-1.5 h-3.5 w-3.5" />
                    Apply Tag to {selectedItems.length.toLocaleString()} Lead(s)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Live Progress Bar */}
          {updating && updateProgress && (
            <div className="space-y-2 p-4 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
              <div className="flex justify-between text-xs text-sky-900 dark:text-sky-200 font-semibold">
                <span>Applying "{bulkTargetTag}" tag...</span>
                <span>{updateProgress.current.toLocaleString()} / {updateProgress.total.toLocaleString()} leads ({Math.round((updateProgress.current / updateProgress.total) * 100)}%)</span>
              </div>
              <Progress value={(updateProgress.current / updateProgress.total) * 100} className="h-2" />
            </div>
          )}

          {/* Leads Table */}
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[40px] px-3">
                      <Checkbox
                        checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedItems.includes(i.id))}
                        onCheckedChange={handleSelectAllCurrentPage}
                        aria-label="Select all on page"
                      />
                    </TableHead>
                    <TableHead className="min-w-[200px]">Company Name</TableHead>
                    <TableHead className="min-w-[160px]">Current Tag</TableHead>
                    <TableHead className="min-w-[140px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Bucket</TableHead>
                    <TableHead className="min-w-[140px]">Account Manager</TableHead>
                    <TableHead className="min-w-[120px]">Date Entered</TableHead>
                    <TableHead className="text-right min-w-[180px]">Change Tag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader className="h-6 w-6 text-[#095c7b]" />
                          <span className="text-xs text-muted-foreground">Loading leads data...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-xs">
                        No leads found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map(item => {
                      const isSelected = selectedItems.includes(item.id);
                      const currentTag = resolveLeadTag(item);
                      const dateVal = getLeadDisplayDateValue(item) || item.dateLeadEntered || (item as any).createdAt;

                      return (
                        <TableRow key={item.id} className={cn("hover:bg-muted/40 transition-colors", isSelected && "bg-sky-50/50 dark:bg-sky-950/20")}>
                          <TableCell className="px-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleRow(item.id)}
                              aria-label={`Select ${item.companyName}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{item.companyName || 'Unnamed Lead'}</span>
                              <span className="text-[11px] text-muted-foreground">ID: {item.id}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderTagBadge(currentTag)}
                          </TableCell>
                          <TableCell>
                            <LeadStatusBadge status={(item.customerStatus || item.status || 'New') as LeadStatus} />
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {item.bucket ? item.bucket.replace(/_/g, ' ') : 'Unassigned'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.accountManagerAssigned || item.dialerAssigned || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {dateVal ? safeFormatDate(dateVal, 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={currentTag}
                              onValueChange={(val) => handleSingleTagUpdate(item, val)}
                            >
                              <SelectTrigger className="w-[150px] h-7 text-xs ml-auto bg-white dark:bg-slate-950">
                                <SelectValue placeholder="Select tag" />
                              </SelectTrigger>
                              <SelectContent>
                                {tags.map(tag => (
                                  <SelectItem key={tag.id} value={tag.name} className="text-xs">
                                    {tag.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(v === 'all' ? 'all' : Number(v))}>
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <span>
                  Showing {isAllPages ? totalItems.toLocaleString() : `${Math.min(totalItems, (currentPage - 1) * effectivePageSize + 1).toLocaleString()} - ${Math.min(totalItems, currentPage * effectivePageSize).toLocaleString()}`} of {totalItems.toLocaleString()} leads
                </span>
              </div>

              {!isAllPages && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: TAG DEFINITIONS & SETTINGS */}
        <TabsContent value="definitions" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map(tag => {
              const count = tagCounts[tag.name] || 0;
              const colorConfig = COLOR_OPTIONS.find(c => c.value === tag.color);

              return (
                <div
                  key={tag.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-5 flex flex-col justify-between shadow-xs transition-all hover:shadow-md space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-foreground">{tag.name}</h4>
                          {tag.isSystem && (
                            <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600">
                              System
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {tag.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Preview:</span>
                        {renderTagBadge(tag.name)}
                      </div>
                      <div className="text-muted-foreground">
                        <strong className="text-foreground">{count.toLocaleString()}</strong> active leads
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditTagDialog(tag)}
                      className="h-7 text-xs gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </Button>
                    {!tag.isSystem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTag(tag)}
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Tag Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingTag ? `Edit Tag: ${editingTag.name}` : 'Create New Account Tag'}</DialogTitle>
            <DialogDescription>
              {editingTag 
                ? 'Update tag description or display badge color.' 
                : 'Define a new classification tag that can be assigned to leads and reported on.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tag Name</label>
              <Input
                placeholder="e.g. Enterprise, VIP, Retail Chain..."
                value={tagNameInput}
                onChange={(e) => setTagNameInput(e.target.value)}
                disabled={editingTag?.isSystem}
                className="text-xs"
              />
              {editingTag?.isSystem && (
                <p className="text-[11px] text-muted-foreground">System tag names cannot be modified.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
              <Input
                placeholder="Briefly describe what this account tag represents..."
                value={tagDescInput}
                onChange={(e) => setTagDescInput(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Badge Color Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_OPTIONS.map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setTagColorInput(opt.value)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-2 flex items-center justify-between text-xs transition-all",
                      tagColorInput === opt.value
                        ? "border-[#095c7b] bg-[#095c7b]/5 ring-1 ring-[#095c7b]"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("w-3 h-3 rounded-full border", opt.class)} />
                      <span>{opt.label}</span>
                    </div>
                    {tagColorInput === opt.value && (
                      <Check className="w-3.5 h-3.5 text-[#095c7b]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTag} className="bg-[#095c7b] hover:bg-[#095c7b]/90 text-white font-semibold">
              Save Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
