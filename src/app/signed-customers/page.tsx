
'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Lead, Address, MapLead, Contact } from '@/lib/types'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Building, Mail, MapPin, Phone, Star, Filter, SlidersHorizontal, X, ExternalLink, Globe, Search, Sparkles, Eye, PlusCircle, Link as LinkIcon, Download, MousePointerClick, CheckSquare, PenSquare, CircleDot, RectangleHorizontal, Spline } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getCompaniesFromFirebase, getLeadsFromFirebase, createNewLead, checkForDuplicateLead, updateLeadDetails } from '@/services/firebase'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, DrawingManagerF } from '@react-google-maps/api'
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { format, startOfDay, endOfDay } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'


type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
};

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ('places' | 'drawing' | 'geometry')[] = ['places', 'drawing', 'geometry'];

export default function SignedCustomersPage() {
  const [allMapData, setAllMapData] = useState<MapLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    companyName: '',
    franchisee: [] as string[],
    prospectedStatus: 'all' as 'all' | 'prospected' | 'not-prospected',
    prospectedDate: undefined as DateRange | undefined,
  });
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<MapLead | null>(null);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geoSearchInputNodeRef = useRef<HTMLInputElement | null>(null);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
  const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
  const [viewingDescription, setViewingDescription] = useState<string | null>(null);
  
  const [prospectToCreate, setProspectToCreate] = useState<google.maps.places.PlaceResult | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [campaign, setCampaign] = useState('');
  const [initialNotes, setInitialNotes] = useState('');

  const [tableSelectedCompanyIds, setTableSelectedCompanyIds] = useState<string[]>([]);
  const [mapSelectedCompanyIds, setMapSelectedCompanyIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);


  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });
  
  const geoSearchInputRef = useCallback((node: HTMLInputElement) => {
    if (node !== null && isLoaded && map && !autocompleteRef.current) {
        geoSearchInputNodeRef.current = node;
        const autocomplete = new window.google.maps.places.Autocomplete(node, {
            types: ['geocode'],
            componentRestrictions: { country: 'au' },
        });
        autocomplete.setFields(['geometry']);
        
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry?.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else if (place.geometry?.location) {
                map.panTo(place.geometry.location);
                map.setZoom(15);
            }
        });
        autocompleteRef.current = autocomplete;
    }
  }, [isLoaded, map]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companies, leads] = await Promise.all([
        getCompaniesFromFirebase(),
        getLeadsFromFirebase({ summary: true }),
      ]);
      const companyMapLeads = companies
        .filter(c => c.latitude != null && c.longitude != null)
        .map(c => ({ ...c, latitude: Number(c.latitude), longitude: Number(c.longitude), isCompany: true, isProspect: false, status: 'Won' as const } as MapLead));
      
      const leadMapLeads = leads
        .filter(l => l.latitude != null && l.longitude != null)
        .map(l => ({ ...l, latitude: Number(l.latitude), longitude: Number(l.longitude), isCompany: false, isProspect: false } as MapLead));

      setAllMapData([...companyMapLeads, ...leadMapLeads]);
    } catch (error) {
      console.error("Failed to fetch signed customers:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch map data.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading) return;
    
    fetchData();

  }, [user, authLoading, router]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const clearFilters = () => {
    setFilters({ 
        companyName: '', 
        franchisee: [], 
        prospectedStatus: 'all',
        prospectedDate: undefined,
    });
    if (geoSearchInputNodeRef.current) {
        geoSearchInputNodeRef.current.value = '';
    }
  };
  
  const uniqueFranchisees: Option[] = useMemo(() => {
    const franchisees = new Set(allMapData.filter(l => l.isCompany).map(lead => lead.franchisee).filter(Boolean));
    return Array.from(franchisees as string[]).map(f => ({ value: f, label: f })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allMapData]);

  const filteredCompanies = useMemo(() => {
    return allMapData.filter(item => {
        if (!item.isCompany) return false;
        
        const companyMatch = filters.companyName ? item.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
        const franchiseeMatch = filters.franchisee.length === 0 || (item.franchisee && filters.franchisee.includes(item.franchisee));
        
        const prospectedStatusMatch = filters.prospectedStatus === 'all' || 
                                     (filters.prospectedStatus === 'prospected' && !!item.lastProspected) || 
                                     (filters.prospectedStatus === 'not-prospected' && !item.lastProspected);

        let prospectedDateMatch = true;
        if (filters.prospectedDate?.from && item.lastProspected) {
            const prospectedDate = new Date(item.lastProspected);
            const fromDate = startOfDay(filters.prospectedDate.from);
            const toDate = filters.prospectedDate.to ? endOfDay(filters.prospectedDate.to) : endOfDay(filters.prospectedDate.from);
            prospectedDateMatch = prospectedDate >= fromDate && prospectedDate <= toDate;
        } else if (filters.prospectedDate?.from) {
            prospectedDateMatch = false;
        }

        return companyMatch && franchiseeMatch && prospectedStatusMatch && prospectedDateMatch;
    });
  }, [allMapData, filters]);

  const mapCompanies = useMemo(() => {
    return filteredCompanies.filter(
      (company) =>
        company.latitude != null &&
        company.longitude != null &&
        !isNaN(Number(company.latitude)) &&
        !isNaN(Number(company.longitude))
    );
  }, [filteredCompanies]);

    const getPlaceDetails = useCallback(async (placeId: string): Promise<google.maps.places.PlaceResult | null> => {
        if (!map) return Promise.resolve(null);
        const placesService = new window.google.maps.places.PlacesService(map);
        return new Promise((resolve) => {
            placesService.getDetails({
                placeId,
                fields: ['name', 'formatted_address', 'address_components', 'website', 'formatted_phone_number', 'geometry', 'place_id', 'business_status', 'types', 'vicinity']
            }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    resolve(place);
                } else {
                    resolve(null);
                }
            });
        });
    }, [map]);

  const handleFindNearbyLeads = useCallback(() => {
    if (!selectedCompany || !selectedCompany.latitude || !selectedCompany.longitude || !window.google?.maps?.geometry) return;
    const centerLatLng = new google.maps.LatLng(selectedCompany.latitude, selectedCompany.longitude);
    
    const nearby = allMapData
      .filter(item => {
        if (item.isCompany || !item.latitude || !item.longitude) return false;
        const itemLatLng = new window.google.maps.LatLng(item.latitude, item.longitude);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(centerLatLng, itemLatLng);
        return distance <= 500;
      })
      .map(lead => ({ place: { name: lead.companyName, vicinity: lead.address?.street, place_id: lead.id }, existingLead: lead, classification: 'B2B' as const }));

    setProspects(nearby);
    if (nearby.length > 0) {
      setIsProspectsDialogOpen(true);
    } else {
      toast({ title: 'No Nearby Leads', description: 'No leads found within a 500m radius.' });
    }
    setSelectedCompany(null);
  }, [selectedCompany, allMapData, map, toast]);

    const findProspects = useCallback(async (location: google.maps.LatLngLiteral, keyword: string, useTextSearch: boolean = false) => {
    if (!map) return;
    setProspects([]); 

    setIsSearchingNearby(true);
    toast({ title: 'AI Analysis', description: 'Searching for similar prospects nearby...' });

    const placesService = new window.google.maps.places.PlacesService(map);
    
    const handleResults = async (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const openProspects = results.filter(place => place.business_status === 'OPERATIONAL');

            const detailedProspectsPromises = openProspects.map(async (place) => {
            if (!place.place_id) return null;
            
            const detailedPlace = await getPlaceDetails(place.place_id);
            if (!detailedPlace) return null;

            const getComponent = (type: string) => detailedPlace.address_components?.find(c => c.types.includes(type))?.long_name;
            const prospectSuburb = getComponent('locality');
            const prospectPostcode = getComponent('postal_code');
            
            const isDuplicate = allMapData.some(existing => {
                const isSimilarName = existing.companyName.toLowerCase().includes(detailedPlace.name?.toLowerCase() || 'a-very-unlikely-company-name') || detailedPlace.name?.toLowerCase().includes(existing.companyName.toLowerCase());
                const isSameLocation = existing.address?.city?.toLowerCase() === prospectSuburb?.toLowerCase() && existing.address?.zip === prospectPostcode;
                return isSimilarName && isSameLocation;
            });

            if (isDuplicate) {
                return null;
            }

            let description = 'No website to analyze.';
            if (detailedPlace.website) {
                try {
                const prospectResult = await aiProspectWebsiteTool({
                    leadId: 'new-lead-prospecting',
                    websiteUrl: detailedPlace.website,
                });
                description = prospectResult.companyDescription || 'AI analysis of website failed.';
                } catch (e) {
                console.error('Error prospecting website for description', e);
                description = 'AI analysis of website failed.';
                }
            }

            const b2cTypes = ['store', 'clothing_store', 'convenience_store', 'department_store', 'shoe_store', 'supermarket', 'bakery', 'cafe', 'restaurant'];
            const classification = detailedPlace.types?.some(type => b2cTypes.includes(type)) ? 'B2C' : 'B2B';
            
            return { place: detailedPlace, existingLead: undefined, classification, description };
            });

            const resolvedProspects = (await Promise.all(detailedProspectsPromises))
                .filter((p): p is ProspectWithLeadInfo => p !== null);

            setProspects(resolvedProspects);
            setIsSearchingNearby(false);

            if (resolvedProspects.length > 0) {
                setIsProspectsDialogOpen(true);
            } else {
                toast({ variant: "destructive", title: "Search Complete", description: "No new prospects found." });
            }
        } else {
            toast({ variant: "destructive", title: "Search Failed", description: "No new prospects found." });
            setIsSearchingNearby(false);
        }
    };
    
    if (useTextSearch) {
        const request: google.maps.places.TextSearchRequest = {
            query: keyword,
            region: 'AU',
        };
        placesService.textSearch(request, handleResults);
    } else {
        const request: google.maps.places.PlaceSearchRequest = {
            location,
            radius: 2000,
            keyword,
        };
        placesService.nearbySearch(request, handleResults);
    }
  }, [map, allMapData, getPlaceDetails, toast]);

    const handleBulkFindSimilar = useCallback(async (companyIds: string[]) => {
        if (companyIds.length === 0 || !map) return;

        setIsSearchingNearby(true);
        toast({ title: "Bulk Analysis Started...", description: `AI is analyzing ${companyIds.length} companies to find prospects.` });
        
        let allFoundProspects = new Map<string, ProspectWithLeadInfo>();
        let updatedCompanyIds: string[] = [];

        for (const companyId of companyIds) {
            const company = allMapData.find(c => c.id === companyId);
            if (!company) continue;

            let searchKeywords: string[] = [];
            if (company.websiteUrl) {
                try {
                    const prospectResult = await aiProspectWebsiteTool({ leadId: company.id, websiteUrl: company.websiteUrl });
                    if (prospectResult.searchKeywords && prospectResult.searchKeywords.length > 0) {
                        searchKeywords = prospectResult.searchKeywords;
                    }
                } catch (e) {
                    console.warn(`AI keyword extraction failed for ${company.companyName}.`);
                }
            }

            if (searchKeywords.length === 0 && company.industryCategory) {
                searchKeywords = [company.industryCategory];
            }

            if (searchKeywords.length > 0 && company.latitude && company.longitude) {
                // Mocking the result of findProspects for bulk operation
                 await new Promise<void>(resolve => {
                    const placesService = new window.google.maps.places.PlacesService(map);
                    const request: google.maps.places.PlaceSearchRequest = {
                        location: { lat: company.latitude!, lng: company.longitude! },
                        radius: 2000,
                        keyword: searchKeywords.join(' '),
                    };
                    placesService.nearbySearch(request, async (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                             const prospectPromises = results.map(async (place) => {
                                if (!place.place_id || allFoundProspects.has(place.place_id)) return null;
                                const isDuplicate = allMapData.some(existing => existing.companyName.toLowerCase() === place.name?.toLowerCase());
                                if (isDuplicate) return null;
                                const detailedPlace = await getPlaceDetails(place.place_id);
                                return { place: detailedPlace, existingLead: undefined, classification: 'B2B', description: 'Bulk search result' } as ProspectWithLeadInfo;
                            });
                            const newProspects = (await Promise.all(prospectPromises)).filter(p => p);
                            newProspects.forEach(p => p && allFoundProspects.set(p.place.place_id!, p));
                        }
                        resolve();
                    });
                });
            }
             await updateLeadDetails(company.id, company, { lastProspected: new Date().toISOString() });
             updatedCompanyIds.push(company.id);
        }
        
        setAllMapData(prev => prev.map(c => updatedCompanyIds.includes(c.id) ? { ...c, lastProspected: new Date().toISOString() } : c));
        
        const finalProspects = Array.from(allFoundProspects.values());
        setProspects(finalProspects);
        setIsSearchingNearby(false);

        if (finalProspects.length > 0) {
            setIsProspectsDialogOpen(true);
        } else {
            toast({ variant: "destructive", title: "Bulk Search Complete", description: "No new unique prospects found." });
        }
        setTableSelectedCompanyIds([]);
        setMapSelectedCompanyIds([]);
    }, [map, allMapData, getPlaceDetails, toast]);
  
  const handleFindSimilar = useCallback(async () => {
    if (!selectedCompany) return;
    await handleBulkFindSimilar([selectedCompany.id]);
    setSelectedCompany(null);
  }, [selectedCompany, handleBulkFindSimilar]);

  const handleFindMultiSites = useCallback(() => {
    if (!selectedCompany) return;
    findProspects({ lat: -25.2744, lng: 133.7751 }, selectedCompany.companyName, true);
    setSelectedCompany(null);
  }, [selectedCompany, findProspects]);

    const escapeCsvCell = (cellData: any) => {
        if (cellData === null || cellData === undefined) {
            return '';
        }
        const stringData = String(cellData);
        if (stringData.includes('"') || stringData.includes(',') || stringData.includes('\n')) {
            return `"${stringData.replace(/"/g, '""')}"`;
        }
        return stringData;
    };
    
  const handleExportProspects = () => {
    if (prospects.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'There are no prospects to export.' });
      return;
    }

    const headers = ['Name', 'Address', 'Classification', 'Description', 'Website', 'Phone'];
    const rows = prospects.map(p => {
      return [
        escapeCsvCell(p.place.name),
        escapeCsvCell(p.place.vicinity),
        escapeCsvCell(p.classification),
        escapeCsvCell(p.description),
        escapeCsvCell(p.place.website),
        escapeCsvCell(p.place.formatted_phone_number),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `nearby_prospects_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
    const handleExportCompanies = () => {
    if (filteredCompanies.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'There are no signed customers to export.' });
      return;
    }

    const headers = ['ID', 'Company Name', 'Franchisee', 'Address', 'Email', 'Phone', 'Last Prospected'];
    const rows = filteredCompanies.map(lead => {
      return [
        escapeCsvCell((lead as any).entityId || 'N/A'),
        escapeCsvCell(lead.companyName),
        escapeCsvCell(lead.franchisee || 'N/A'),
        escapeCsvCell(formatAddress(lead.address)),
        escapeCsvCell(lead.customerServiceEmail || 'N/A'),
        escapeCsvCell(lead.customerPhone || 'N/A'),
        escapeCsvCell(lead.lastProspected ? new Date(lead.lastProspected).toLocaleDateString() : 'N/A'),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `signed_customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const formatAddress = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
  }
  
  const onMarkerClick = useCallback((company: MapLead) => {
      if (isMultiSelectMode) {
        setMapSelectedCompanyIds(prev =>
            prev.includes(company.id)
                ? prev.filter(id => id !== company.id)
                : [...prev, company.id]
        );
      } else {
        setSelectedCompany(company);
      }
  }, [isMultiSelectMode]);

  const onInfoWindowClose = useCallback(() => {
    setSelectedCompany(null);
  }, []);
  
  const handleAddLeadClick = async (place: google.maps.places.PlaceResult) => {
    if (!place.website) {
        openCreateLeadPage(place);
        return;
    }
    
    try {
        const prospectResult = await aiProspectWebsiteTool({ leadId: 'new-lead-prospecting', websiteUrl: place.website });
        const hasEmail = prospectResult.contacts?.some(c => c.email);
        const hasPhone = prospectResult.contacts?.some(c => c.phone && c.phone !== 'N/A') || place.formatted_phone_number;

        if (hasEmail && hasPhone) {
            setProspectToCreate(place);
        } else {
            openCreateLeadPage(place, prospectResult.contacts);
        }

    } catch (error) {
        console.error('Error during prospecting, redirecting to manual entry:', error);
        openCreateLeadPage(place);
    }
  };
  
    const openCreateLeadPage = (place: google.maps.places.PlaceResult, contacts?: Contact[]) => {
        const params = new URLSearchParams();
        if (place.name) params.set('companyName', place.name);
        if (place.website) params.set('websiteUrl', place.website);
        if (place.formatted_phone_number) params.set('phone', place.formatted_phone_number);
        
        if (place.address_components) {
            const get = (type: string) => place.address_components?.find(c => c.types.includes(type))?.long_name || '';
            const street_number = get('street_number');
            const route = get('route');
            params.set('street', `${street_number} ${route}`.trim());
            params.set('city', get('locality') || get('postal_town'));
            params.set('state', get('administrative_area_level_1'));
            params.set('zip', get('postal_code'));
        } else if (place.vicinity) {
            params.set('street', place.vicinity);
        }
        
        if (place.geometry?.location) {
            params.set('lat', place.geometry.location.lat().toString());
            params.set('lng', place.geometry.location.lng().toString());
        }

        const primaryContact = contacts?.[0];
        if (primaryContact?.email) {
            // Even if one is missing, we pass what we have. The form will require the rest.
        }

        window.open(`/leads/new?${params.toString()}`, '_blank');
        toast({ title: "Complete Lead Details", description: "Please fill in the missing email or phone number." });
    };


  const handleCreateLeadFromProspect = async () => {
    if (!prospectToCreate || !userProfile?.displayName) return;

    const place = prospectToCreate;
    if (!place.name || !place.vicinity || !place.geometry?.location) {
        toast({ variant: 'destructive', title: 'Error', description: 'Prospect is missing required information (name, address, location).' });
        return;
    }

    const placeId = place.place_id;
    if (!placeId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Prospect is missing a Place ID.' });
        return;
    }

    const duplicateId = await checkForDuplicateLead(place.name, place.formatted_phone_number || '');
    if (duplicateId) {
        setDuplicateLeadId(duplicateId);
        setProspectToCreate(null);
        return;
    }

    setIsCreatingLead(true);
    setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: true } : p));
    
    let leadCampaign = campaign;
    if (userProfile?.role === 'Field Sales' || userProfile?.role === 'Field Sales Admin') {
        leadCampaign = 'Door-to-Door';
    }
    if (!leadCampaign && (userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin')) {
         toast({ variant: 'destructive', title: 'Campaign Required', description: 'Please select a campaign for this lead.' });
         setIsCreatingLead(false);
         setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: false } : p));
         return;
    }

    let primaryContact: Omit<Contact, 'id'> | null = null;
    if (place.website) {
        try {
            const hunterResult = await aiProspectWebsiteTool({ leadId: 'new-lead-prospecting', websiteUrl: place.website });
            if (hunterResult.contacts && hunterResult.contacts.length > 0) {
                const firstContact = hunterResult.contacts[0];
                primaryContact = {
                    name: firstContact.name || 'Info',
                    title: firstContact.title || 'Primary Contact',
                    email: firstContact.email || '',
                    phone: firstContact.phone || place.formatted_phone_number || '',
                };
                toast({ title: 'Contact Found!', description: `Automatically found contact: ${primaryContact.name}.` });
            }
        } catch (error) { console.warn('AI prospecting for contact failed.', error); }
    }
    
    if (!primaryContact) {
        const websiteDomain = (place.website || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        primaryContact = {
            name: `Info ${place.name}`,
            title: 'Primary Contact',
            email: websiteDomain ? `info@${websiteDomain}` : '',
            phone: place.formatted_phone_number || '',
        };
    }
    const nameParts = primaryContact.name.split(' ');
    
    const addressData = { street: place.vicinity, city: '', state: '', zip: '', country: 'Australia' };
    if (place.address_components) {
        const get = (type: string, useShortName = false) => {
            const comp = place.address_components?.find(c => c.types.includes(type));
            return useShortName ? comp?.short_name : comp?.long_name;
        };
        addressData.city = get('locality') || get('postal_town') || '';
        addressData.state = get('administrative_area_level_1', true) || '';
        addressData.zip = get('postal_code') || '';
    }

    const newLeadData = {
        companyName: place.name,
        websiteUrl: place.website || '',
        campaign: leadCampaign,
        address: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            ...addressData,
        },
        contact: {
            firstName: nameParts[0] || 'Info',
            lastName: nameParts.slice(1).join(' ') || place.name,
            title: primaryContact.title,
            email: primaryContact.email,
            phone: primaryContact.phone,
        },
        initialNotes: initialNotes,
        dialerAssigned: userProfile.displayName,
    };

    try {
        const result = await createNewLead(newLeadData);
        if (result.success && result.leadId) {
            toast({ title: 'Lead Created', description: `${newLeadData.companyName} has been created successfully.` });
            
            const newMapLead: MapLead = {
              id: result.leadId!,
              companyName: newLeadData.companyName,
              status: 'New',
              address: newLeadData.address as Address,
              latitude: newLeadData.address.lat,
              longitude: newLeadData.address.lng,
              dialerAssigned: undefined,
              customerPhone: newLeadData.contact.phone,
            };
            setAllMapData(prev => [...prev, newMapLead]);
            setProspects(prev => prev.map(p => p.place.place_id === placeId
                ? { ...p, isAdding: false, existingLead: newMapLead }
                : p
            ));
        } else {
            toast({ variant: 'destructive', title: 'Creation Failed', description: result.message || 'Failed to create lead.' });
            setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: false } : p));
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'An unexpected error occurred.' });
        setProspects(prev => prev.map(p => p.place.place_id === placeId ? { ...p, isAdding: false } : p));
    } finally {
        setIsCreatingLead(false);
        setProspectToCreate(null);
        setInitialNotes('');
        setCampaign('');
    }
  };
  
  const handleSelectAllTable = (checked: boolean) => {
    setTableSelectedCompanyIds(checked ? filteredCompanies.map(c => c.id) : []);
  };
  
  const handleSelectTableCompany = (companyId: string, checked: boolean) => {
    setTableSelectedCompanyIds(prev => 
      checked ? [...prev, companyId] : prev.filter(id => id !== companyId)
    );
  };
  
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
    const onDrawingComplete = (overlay: google.maps.Circle | google.maps.Rectangle | google.maps.Polygon) => {
        const companiesInShape = filteredCompanies.filter(company => {
            if (company.latitude && company.longitude) {
                const companyLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
                if (overlay.get('radius')) { // Circle
                    return google.maps.geometry.spherical.computeDistanceBetween(
                        (overlay as google.maps.Circle).getCenter()!, 
                        companyLatLng
                    ) <= (overlay as google.maps.Circle).getRadius();
                } else if (overlay.get('bounds')) { // Rectangle
                    return (overlay as google.maps.Rectangle).getBounds()!.contains(companyLatLng);
                } else { // Polygon
                    return google.maps.geometry.poly.containsLocation(companyLatLng, overlay as google.maps.Polygon);
                }
            }
            return false;
        });

        setMapSelectedCompanyIds(prev => [...new Set([...prev, ...companiesInShape.map(c => c.id)])]);
        
        toast({
          title: `${companiesInShape.length} Companies Added to Selection`,
          description: "You can continue to select more areas or individual pins.",
        });
        
        (overlay as any).setMap(null);
        setDrawingMode(null);
        setIsDrawing(false);
    };

    const startDrawing = (mode: google.maps.drawing.OverlayType) => {
        setIsDrawing(true);
        setDrawingMode(mode);
        toast({
            title: "Drawing Mode Activated",
            description: `Draw a ${mode.toLowerCase()} on the map to select companies. Press Esc or click Cancel to exit.`,
        });
    };

    const cancelDrawing = () => {
        setIsDrawing(false);
        setDrawingMode(null);
        if (drawingManagerRef.current) {
            drawingManagerRef.current.setDrawingMode(null);
        }
        toast({ title: "Drawing Mode Canceled" });
    };

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }
  
  const hasActiveFilters = filters.companyName !== '' || filters.franchisee.length > 0 || filters.prospectedStatus !== 'all' || !!filters.prospectedDate || (geoSearchInputNodeRef.current && geoSearchInputNodeRef.current.value !== '');

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Signed Customers</h1>
        <p className="text-muted-foreground">A list of all your won accounts.</p>
      </header>

       <Collapsible>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
               <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="ml-2">Toggle Filters</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="franchisee">Franchisee</Label>
                         <MultiSelectCombobox
                            options={uniqueFranchisees}
                            selected={filters.franchisee}
                            onSelectedChange={(selected) => handleFilterChange('franchisee', selected)}
                            placeholder="Select franchisees..."
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="prospected-status">Prospected Status</Label>
                        <Select value={filters.prospectedStatus} onValueChange={(value) => handleFilterChange('prospectedStatus', value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="prospected">Prospected</SelectItem>
                                <SelectItem value="not-prospected">Not Prospected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prospected-date">Prospected Date</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                              <Button id="prospected-date" variant={"outline"} className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.prospectedDate?.from ? (filters.prospectedDate.to ? <>{format(filters.prospectedDate.from, "LLL dd, y")} - {format(filters.prospectedDate.to, "LLL dd, y")}</> : format(filters.prospectedDate.from, "LLL dd, y")) : <span>Pick a date range</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="range" selected={filters.prospectedDate} onSelect={(range) => handleFilterChange('prospectedDate', range)} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="geo-search">Go to Location</Label>
                      <Input
                          id="geo-search"
                          ref={geoSearchInputRef}
                          placeholder="Suburb, state, postcode..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                            }
                          }}
                      />
                    </div>
                     {hasActiveFilters && (
                        <div className="space-y-2 col-start-1">
                            <Button variant="ghost" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" /> Clear Filters
                            </Button>
                        </div>
                    )}
                </CardContent>
            </CollapsibleContent>
          </Card>
      </Collapsible>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Customer Map</CardTitle>
                <CardDescription>Visual representation of your signed customers.</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                 <Button onClick={() => setIsMultiSelectMode(!isMultiSelectMode)} variant={isMultiSelectMode ? 'secondary' : 'outline'} size="sm">
                    <MousePointerClick className="mr-2 h-4 w-4" />
                    {isMultiSelectMode ? 'Exit Select Mode' : 'Select on Map'}
                 </Button>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isDrawing}>
                            <PenSquare className="mr-2 h-4 w-4" />
                            Draw to Select
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => startDrawing(google.maps.drawing.OverlayType.CIRCLE)}><CircleDot className="mr-2 h-4 w-4" />Circle</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startDrawing(google.maps.drawing.OverlayType.RECTANGLE)}><RectangleHorizontal className="mr-2 h-4 w-4" />Rectangle</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startDrawing(google.maps.drawing.OverlayType.POLYGON)}><Spline className="mr-2 h-4 w-4" />Polygon</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
                 {isDrawing && (<Button onClick={cancelDrawing} variant="destructive" size="sm"><X className="mr-2 h-4 w-4" />Cancel Draw</Button>)}
                 {mapSelectedCompanyIds.length > 0 && (
                     <Button size="sm" onClick={() => handleBulkFindSimilar(mapSelectedCompanyIds)} disabled={isSearchingNearby}>
                        {isSearchingNearby ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /><span>AI Find Similar for Selected ({mapSelectedCompanyIds.length})</span></>}
                     </Button>
                 )}
              </div>
            </div>
        </CardHeader>
        <CardContent>
            <div style={{ height: '500px', width: '100%' }}>
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={4}
                        onLoad={setMap}
                    >
                        {isDrawing && (
                            <DrawingManagerF
                                onLoad={(dm) => (drawingManagerRef.current = dm)}
                                onCircleComplete={(c) => onDrawingComplete(c)}
                                onRectangleComplete={(r) => onDrawingComplete(r)}
                                onPolygonComplete={(p) => onDrawingComplete(p)}
                                drawingMode={drawingMode}
                                options={{
                                    drawingControl: false,
                                    circleOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                                    rectangleOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                                    polygonOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                                }}
                            />
                        )}
                        {mapCompanies.map(company => (
                            <MarkerF
                                key={company.id}
                                position={{ lat: Number(company.latitude!), lng: Number(company.longitude!) }}
                                onClick={() => onMarkerClick(company)}
                                icon={{
                                    url: isMultiSelectMode && mapSelectedCompanyIds.includes(company.id)
                                        ? 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png'
                                        : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                                }}
                            />
                        ))}

                        {selectedCompany && (
                            <InfoWindowF
                                position={{ lat: Number(selectedCompany.latitude!), lng: Number(selectedCompany.longitude!) }}
                                onCloseClick={onInfoWindowClose}
                            >
                                <div className="p-2 max-w-xs space-y-2">
                                    <h3 className="font-bold text-lg">{selectedCompany.companyName}</h3>
                                    {selectedCompany.lastProspected && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-secondary rounded-md">
                                            <Sparkles className="h-4 w-4 text-amber-500" />
                                            <span>Last prospected: {new Date(selectedCompany.lastProspected).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    <p className="text-sm text-muted-foreground">{formatAddress(selectedCompany.address)}</p>
                                    <div className="flex flex-col gap-2">
                                        <Button size="sm" onClick={() => window.open(`/companies/${selectedCompany.id}`, '_blank')}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> View Profile
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleFindNearbyLeads}>
                                            <Search className="mr-2 h-4 w-4" /> Nearby Leads
                                        </Button>
                                         <Button size="sm" variant="outline" onClick={handleFindSimilar} disabled={isSearchingNearby || (selectedCompany.lastProspected && isToday(selectedCompany.lastProspected))}>
                                            {isSearchingNearby ? <Loader /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            {isSearchingNearby ? 'Searching...' : 'AI Find Similar'}
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleFindMultiSites}>
                                            <Building className="mr-2 h-4 w-4" /> Find Multi-sites
                                        </Button>
                                    </div>
                                </div>
                            </InfoWindowF>
                        )}
                    </GoogleMap>
                ) : loadError ? (
                  <div className="flex h-full items-center justify-center text-destructive">Error loading map.</div>
                ) : (
                  <div className="flex h-full items-center justify-center"><Loader /></div>
                )}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  <span>All Signed Customers</span>
                </CardTitle>
                <Badge variant="secondary">{filteredCompanies.length} customer(s)</Badge>
            </div>
            <div className="flex items-center gap-2">
                 {tableSelectedCompanyIds.length > 0 && (
                    <Button size="sm" onClick={() => handleBulkFindSimilar(tableSelectedCompanyIds)} disabled={isSearchingNearby}>
                        {isSearchingNearby ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /><span>AI Find Similar for Selected ({tableSelectedCompanyIds.length})</span></>}
                     </Button>
                )}
                <Button onClick={handleExportCompanies} variant="outline" size="sm" disabled={filteredCompanies.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead>
                     <Checkbox
                        checked={tableSelectedCompanyIds.length > 0 && tableSelectedCompanyIds.length === filteredCompanies.length}
                        onCheckedChange={handleSelectAllTable}
                      />
                  </TableHead>
                  <TableHead className="hidden md:table-cell">ID</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Franchisee</TableHead>
                  <TableHead className="hidden sm:table-cell">Address</TableHead>
                  <TableHead>Last Prospected</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : filteredCompanies.length > 0 ? (
                  filteredCompanies.map((lead) => (
                    <TableRow key={lead.id} data-state={tableSelectedCompanyIds.includes(lead.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                          checked={tableSelectedCompanyIds.includes(lead.id)}
                          onCheckedChange={(checked) => handleSelectTableCompany(lead.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{(lead as any).entityId || 'N/A'}</TableCell>
                      <TableCell>
                         <Button variant="link" className="p-0 h-auto flex items-center gap-2 text-left" onClick={() => window.open(`/companies/${lead.id}`, '_blank')}>
                            <Building className="h-4 w-4" />
                            {lead.companyName}
                        </Button>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.franchisee || 'N/A'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{formatAddress(lead.address)}</span>
                        </div>
                      </TableCell>
                       <TableCell>
                         {lead.lastProspected ? (
                           <div className="flex items-center gap-2 text-sm">
                             <Sparkles className="h-4 w-4 text-amber-500" />
                             {new Date(lead.lastProspected).toLocaleDateString()}
                           </div>
                         ) : 'N/A'}
                       </TableCell>
                       <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.customerServiceEmail || 'N/A'}</span>
                        </div>
                       </TableCell>
                       <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.customerPhone || 'N/A'}</span>
                        </div>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No signed customers found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
        <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
            <DialogContent className="max-w-4xl w-[95vw] md:w-full">
                <DialogHeader>
                    <DialogTitle>Nearby Prospects</DialogTitle>
                    <DialogDescription>
                        Found {prospects.length} potential leads.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                    <div className="md:hidden space-y-4">
                        {prospects.map(prospectInfo => (
                            <Card key={prospectInfo.place.place_id} className="p-4">
                                <div className="font-medium pr-2">{prospectInfo.place.name}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {prospectInfo.place.vicinity}
                                </div>
                                {prospectInfo.description && (
                                    <div>
                                    <p className="text-sm my-2 text-muted-foreground line-clamp-2">
                                        {prospectInfo.description}
                                    </p>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setViewingDescription(prospectInfo.description || null)}>Read More</Button>
                                    </div>
                                )}
                                <div className="flex justify-between items-center mt-2">
                                    <Badge variant={prospectInfo.classification === 'B2B' ? 'default' : 'secondary'}>
                                        {prospectInfo.classification}
                                    </Badge>
                                    {prospectInfo.existingLead ? (
                                        <Button size="sm" variant="outline" onClick={() => window.open(prospectInfo.existingLead!.isCompany ? `/companies/${prospectInfo.existingLead!.id}` : `/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
                                            <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                    ) : (
                                        <Button size="sm" onClick={() => handleAddLeadClick(prospectInfo.place)} disabled={prospectInfo.isAdding}>
                                            {prospectInfo.isAdding ? <Loader /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                            Add
                                        </Button>
                                    )}
                                </div>
                                 {prospectInfo.place.website && (
                                    <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                                        <a href={prospectInfo.place.website} target="_blank" rel="noopener noreferrer">
                                            <Globe className="mr-2 h-4 w-4" />
                                            Visit Website
                                        </a>
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </div>
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prospects.map(prospectInfo => (
                                    <TableRow key={prospectInfo.place.place_id}>
                                        <TableCell>
                                            <div className="font-medium">{prospectInfo.place.name}</div>
                                             {prospectInfo.place.website && (
                                                <Button asChild variant="link" size="sm" className="p-0 h-auto">
                                                    <a href={prospectInfo.place.website} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1">
                                                        <Globe className="h-3 w-3" />
                                                        Website
                                                    </a>
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                                <div className="flex flex-col items-start max-w-xs">
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {prospectInfo.description}
                                                    </p>
                                                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setViewingDescription(prospectInfo.description || null)}>Read More</Button>
                                                </div>
                                        </TableCell>
                                        <TableCell>{prospectInfo.place.vicinity}</TableCell>
                                        <TableCell><Badge variant={prospectInfo.classification === 'B2B' ? 'default' : 'secondary'}>{prospectInfo.classification}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            {prospectInfo.existingLead ? (
                                                <Button size="sm" variant="outline" onClick={() => window.open(prospectInfo.existingLead!.isCompany ? `/companies/${prospectInfo.existingLead!.id}` : `/leads/${prospectInfo.existingLead!.id}`, '_blank')}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </Button>
                                            ) : (
                                                <Button size="sm" onClick={() => handleAddLeadClick(prospectInfo.place)} disabled={prospectInfo.isAdding}>
                                                    {prospectInfo.isAdding ? <Loader /> : <PlusCircle className="mr-2 h-4 w-4"/>}
                                                    {prospectInfo.isAdding ? 'Adding...' : 'Add Lead'}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
                 <DialogFooter>
                    <Button onClick={handleExportProspects} variant="outline" disabled={prospects.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Prospects
                    </Button>
                    <Button variant="outline" onClick={() => setIsProspectsDialogOpen(false)}>Close</Button>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
         <Dialog open={!!duplicateLeadId} onOpenChange={() => setDuplicateLeadId(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Duplicate Lead Found</DialogTitle>
                    <DialogDescription>
                        A lead with this name or phone number already exists in the system.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setDuplicateLeadId(null)}>Cancel</Button>
                    <Button onClick={() => { window.open(`/leads/${duplicateLeadId}`, '_blank'); setDuplicateLeadId(null); }}>
                        View Existing Lead
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
         <Dialog open={!!viewingDescription} onOpenChange={() => setViewingDescription(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI Company Description</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] text-sm text-muted-foreground">
                    {viewingDescription}
                </ScrollArea>
            </DialogContent>
        </Dialog>
        <Dialog open={!!prospectToCreate} onOpenChange={(open) => !open && setProspectToCreate(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Lead</DialogTitle>
                    <DialogDescription>Confirm details for {prospectToCreate?.name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {(userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin') && (
                        <div className="space-y-2">
                            <Label htmlFor="campaign-select">Campaign *</Label>
                            <Select value={campaign} onValueChange={setCampaign}>
                                <SelectTrigger id="campaign-select">
                                    <SelectValue placeholder="Select a campaign" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Outbound">Outbound</SelectItem>
                                    <SelectItem value="Door-to-Door">Door-to-Door</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="initial-notes">Initial Notes (Optional)</Label>
                        <Textarea id="initial-notes" placeholder="e.g., Found via AI prospect search for cafes." value={initialNotes} onChange={(e) => setInitialNotes(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setProspectToCreate(null)}>Cancel</Button>
                    <Button onClick={handleCreateLeadFromProspect} disabled={isCreatingLead || ((userProfile?.role === 'user' || userProfile?.role === 'admin' || userProfile?.role === 'Lead Gen' || userProfile?.role === 'Lead Gen Admin') && !campaign)}>
                        {isCreatingLead ? <Loader /> : 'Confirm & Create Lead'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  )
}
