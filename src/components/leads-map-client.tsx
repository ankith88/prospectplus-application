
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  DirectionsRenderer,
  DrawingManagerF,
  PolygonF,
  RectangleF,
} from '@react-google-maps/api';
import type { LeadStatus, Address, MapLead, SavedRoute, StorableRoute, Activity, UserProfile, Contact, Lead } from '@/lib/types';
import { Loader, FullScreenLoader } from '@/components/ui/loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatusBadge } from '@/components/lead-status-badge';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, CheckSquare, Clock, GripVertical, Milestone, Play, Route, Trash2, XCircle, Save, User, Filter, X, Calendar as CalendarIcon, Clipboard, Briefcase, MapPin, Globe, Sparkles, Search, Info, StickyNote, Mic, MicOff, Camera, PenSquare, Move, MoreVertical, CircleDot, RectangleHorizontal, Spline, Map as MapIcon, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllUserRoutes, getUserRoutes, getAllUsers, getCompaniesFromFirebase, saveUserRoute, updateUserRoute, deleteUserRoute, getLeadsFromFirebase, createNewLead, checkForDuplicateLead, updateLeadDetails } from '@/services/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { MultiSelectCombobox, type Option } from '@/components/ui/multi-select-combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { prospectWebsiteTool as aiProspectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';


type ProspectWithLeadInfo = {
    place: google.maps.places.PlaceResult;
    existingLead?: MapLead;
    isAdding?: boolean;
    classification?: 'B2B' | 'B2C' | 'Unknown';
    description?: string;
};

type SortableCompanyKeys = 'entityId' | 'companyName' | 'franchisee' | 'lastProspected';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const center = {
  lat: -25.2744,
  lng: 133.7751,
};

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places', 'drawing', 'geometry', 'visualization'];

function getPinColor(status: LeadStatus, isSelected: boolean, isHovered: boolean) {
    if (isSelected) return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    if (isHovered) return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png';

    switch (status) {
        case 'Won': return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
        case 'Lost':
        case 'Unqualified':
            return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
        case 'In Progress':
        case 'Contacted':
        case 'Connected':
             return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        case 'Qualified':
        case 'Pre Qualified':
        case 'Trialing ShipMate':
             return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
        default:
            return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
}

const formatAddress = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
}

export default function LeadsMapClient() {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });
    
    // Data State
    const [allMapData, setAllMapData] = useState<MapLead[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const { userProfile, loading: authLoading, savedRoutes, setSavedRoutes } = useAuth();
    
    // Map Interaction State
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedLead, setSelectedLead] = useState<MapLead | null>(null);
    const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
    const [myLocation, setMyLocation] = useState<google.maps.LatLngLiteral | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    
    // Routing State
    const [selectedRouteLeads, setSelectedRouteLeads] = useState<MapLead[]>([]);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [travelMode, setTravelMode] = useState<google.maps.TravelMode>('DRIVING');
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [isSaveRouteDialogOpen, setIsSaveRouteDialogOpen] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [routeDate, setRouteDate] = useState<Date | undefined>();
    const [routeAssignee, setRouteAssignee] = useState('');
    const [startPoint, setStartPoint] = useState('');
    const [endPoint, setEndPoint] = useState('');
    const [totalDistance, setTotalDistance] = useState<string | null>(null);
    const [totalDuration, setTotalDuration] = useState<string | null>(null);
    const [isRouteActive, setIsRouteActive] = useState(false);
    const [isSavingRoute, setIsSavingRoute] = useState(false);
    const [loadedRoute, setLoadedRoute] = useState<SavedRoute | null>(null);

    // Prospecting Area State
    const [isSaveAreaDialogOpen, setIsSaveAreaDialogOpen] = useState(false);
    const [isSavingArea, setIsSavingArea] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaAssignee, setNewAreaAssignee] = useState('');
    const [streetsForArea, setStreetsForArea] = useState<{ place_id: string; description: string }[]>([]);
    const [drawnOverlay, setDrawnOverlay] = useState<google.maps.Polygon | google.maps.Rectangle | null>(null);
    const [areaLeads, setAreaLeads] = useState<MapLead[]>([]);
    const [prospects, setProspects] = useState<ProspectWithLeadInfo[]>([])
    const [isProspectsDialogOpen, setIsProspectsDialogOpen] = useState(false);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('route-planner');
    const [activeProspectingTab, setActiveProspectingTab] = useState("by-drawing");
    const [selectionMode, setSelectionMode] = useState<'info' | 'select'>('info');
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingMode, setDrawingMode] = useState<google.maps.drawing.OverlayType | null>(null);

    // Autocomplete Refs
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const streetInputRef = useRef<HTMLInputElement | null>(null);
    const startPointRef = useRef<HTMLInputElement | null>(null);
    const endPointRef = useRef<HTMLInputElement | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

    // Other State
    const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);
    const [viewingDescription, setViewingDescription] = useState<string | null>(null);
    const [prospectToCreate, setProspectToCreate] = useState<google.maps.places.PlaceResult | null>(null);
    const [isCreatingLead, setIsCreatingLead] = useState(false);
    const [campaign, setCampaign] = useState('');
    const [initialNotes, setInitialNotes] = useState('');

    const [mapSelectedCompanyIds, setMapSelectedCompanyIds] = useState<string[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const infoWindowOptions = {
        pixelOffset: isLoaded ? new window.google.maps.Size(0, -30) : undefined,
    };
    
    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [leads, companies, users, routes] = await Promise.all([
                getLeadsFromFirebase({ summary: true }),
                getCompaniesFromFirebase(),
                getAllUsers(),
                userProfile?.uid ? getUserRoutes(userProfile.uid) : Promise.resolve([]),
            ]);
            
            const combinedData = new Map<string, Lead>();
            
            leads.forEach(lead => combinedData.set(lead.id, lead));
            
            companies.forEach(company => {
                if(!combinedData.has(company.id)) {
                  combinedData.set(company.id, { ...company, isCompany: true });
                } else {
                  // If lead exists, update it to be a company if status is Won
                  const existingLead = combinedData.get(company.id);
                  if (existingLead && existingLead.status === 'Won') {
                      combinedData.set(company.id, { ...existingLead, ...company, isCompany: true });
                  }
                }
            });

            const allItems = Array.from(combinedData.values());

            const mapLeads = allItems
                .filter(item => item.latitude != null && item.longitude != null)
                .map(item => ({ ...item, latitude: Number(item.latitude), longitude: Number(item.longitude), isCompany: item.status === 'Won', isProspect: false } as MapLead));

            setMapData(mapLeads);
            setAllUsers(users);
            setSavedRoutes(routes);

        } catch (error) {
            console.error("Failed to fetch map data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load initial map data.' });
        } finally {
            setLoadingData(false);
        }
    }, [userProfile, toast, setSavedRoutes]);
    
    useEffect(() => {
        if (isLoaded && userProfile) {
            fetchData();
        }
    }, [isLoaded, userProfile, fetchData]);

     const handleLoadRoute = useCallback((route: SavedRoute) => {
        if (!isLoaded) return;
        
        setDirections(route.directions);
        setLoadedRoute(route);
        setSelectedRouteLeads(route.leads.map(l => ({ ...l, status: 'New' } as MapLead)));
        setTravelMode((route.travelMode || 'DRIVING') as google.maps.TravelMode);
        setStartPoint(route.startPoint || '');
        setEndPoint(route.endPoint || '');
        setTotalDistance(route.totalDistance || null);
        setTotalDuration(route.totalDuration || null);

        if (route.id) {
            localStorage.setItem('activeRouteId', route.id);
            setIsRouteActive(true);
            toast({ title: 'Route Loaded', description: `Route "${route.name}" is now active.` });
        }
        setActiveTab('route-planner');
    }, [isLoaded, toast]);
    
    useEffect(() => {
        if (loadingData || !isLoaded || allMapData.length === 0) return;

        const activeRouteId = localStorage.getItem('activeRouteId');
        const routeToLoadId = searchParams.get('routeId');
        
        const targetRouteId = routeToLoadId || activeRouteId;

        if (targetRouteId) {
            const routeToLoad = savedRoutes.find(r => r.id === targetRouteId);
            if (routeToLoad) {
                handleLoadRoute(routeToLoad);
                if (routeToLoadId) {
                    router.replace('/leads/map', { scroll: false });
                }
            }
        }
        const leadIdToAdd = searchParams.get('addLead');
        if (leadIdToAdd) {
            const lead = allMapData.find(l => l.id === leadIdToAdd);
            if (lead) {
                setSelectedRouteLeads(prev => {
                    if (prev.find(p => p.id === lead.id)) return prev;
                    return [...prev, lead];
                });
                toast({ title: 'Lead Added to Route', description: `${lead.companyName} has been added to your current route.`});
                router.replace('/leads/map', { scroll: false });
            }
        }
        const areaToLoadId = searchParams.get('loadArea');
        if (areaToLoadId && map) {
             const allSystemRoutes = [...savedRoutes];
             const routeToLoad = allSystemRoutes.find(r => r.id === areaToLoadId);
             if (routeToLoad) {
                setActiveTab('prospecting');
                if (routeToLoad.shape) {
                    if (routeToLoad.shape.type === 'polygon' && routeToLoad.shape.paths) {
                        const polygon = new window.google.maps.Polygon({ paths: routeToLoad.shape.paths });
                        setDrawnOverlay(polygon);
                        const bounds = new window.google.maps.LatLngBounds();
                        routeToLoad.shape.paths[0].forEach(path => bounds.extend(path));
                        map.fitBounds(bounds);
                    } else if (routeToLoad.shape.type === 'rectangle' && routeToLoad.shape.bounds) {
                        const rectangle = new window.google.maps.Rectangle({ bounds: routeToLoad.shape.bounds });
                        setDrawnOverlay(rectangle);
                        map.fitBounds(rectangle.getBounds()!);
                    }
                    setAreaLeads(routeToLoad.leads as MapLead[]);
                } else if (routeToLoad.streets) {
                    setStreetsForArea(routeToLoad.streets);
                }
                toast({ title: "Prospecting Area Loaded", description: `Loaded "${routeToLoad.name}".`});
             }
             router.replace('/leads/map', { scroll: false });
        }


    }, [searchParams, allMapData, toast, router, savedRoutes, handleLoadRoute, map, loadingData, isLoaded]);

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                setMyLocation({ lat: latitude, lng: longitude });
                if (!searchParams.toString()) { // Don't pan if loading a specific entity
                    mapInstance.panTo({ lat: latitude, lng: longitude });
                    mapInstance.setZoom(12);
                }
            },
            (error) => {
                console.error("Error getting user location:", error);
                setLocationError("Could not get your location. Please enable location services in your browser.");
            }
        );
    }, [searchParams]);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
      if (isDrawing || !isLoaded || !window.google) return;

      if (selectionMode === 'select' && map && e.latLng) {
        const latLng = e.latLng;
        let nearestLead: MapLead | null = null;
        let minDistance = Infinity;

        allMapData.forEach(lead => {
          if (lead.latitude && lead.longitude) {
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(latLng, leadLatLng);
            if (distance < 500) { // Only consider leads within 500 meters of the click
              if (distance < minDistance) {
                minDistance = distance;
                nearestLead = lead;
              }
            }
          }
        });

        if (nearestLead) {
          setSelectedRouteLeads(prev => {
            const isSelected = prev.some(l => l.id === nearestLead!.id);
            if (isSelected) {
              return prev.filter(l => l.id !== nearestLead!.id);
            }
            return [...prev, nearestLead!];
          });
        }
      }
    }, [isDrawing, isLoaded, map, allMapData, selectionMode]);

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

    const handleFindNearbyCompanies = useCallback(async (lead: MapLead) => {
        if (!lead?.latitude || !lead?.longitude || !window.google?.maps?.geometry) {
            toast({ variant: 'destructive', title: 'Location Missing', description: 'This lead does not have valid coordinates to find nearby customers.' });
            return;
        }

        setIsFindingNearby(true);
        setFindingNearbyFor(lead);
        try {
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            
            const nearby = allMapData.filter(company => {
            if (!company.isCompany || !company.latitude || !company.longitude || company.id === lead.id) {
                return false;
            }
            const itemLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, itemLatLng);
            return distance <= 1000; // 1km radius
            });

            setNearbyCompanies(nearby);
            setIsNearbyCompaniesDialogOpen(true);
            if(nearby.length === 0) {
                toast({ title: 'No Nearby Customers', description: 'No signed customers found within a 1km radius.' });
            }
        } catch (error) {
            console.error("Error finding nearby companies:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch nearby companies.' });
        } finally {
            setIsFindingNearby(false);
            setFindingNearbyFor(null);
        }
    }, [allMapData, toast]);

    const findProspects = useCallback(async (location: google.maps.LatLngLiteral, keyword: string, useTextSearch: boolean = false) => {
        if (!map) return;
        setProspects([]); 

        setIsSearchingNearby(true);
        toast({ title: 'AI Analysis', description: 'Searching for similar prospects nearby...' });

        const placesService = new window.google.maps.places.PlacesService(map);
        
        const coreName = keyword.split(' - ')[0];

        const handleResults = async (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const openProspects = results.filter(place => place.business_status === 'OPERATIONAL');

            const detailedProspectsPromises = openProspects.map(async (place) => {
            if (!place.place_id) return null;
            
            const detailedPlace = await getPlaceDetails(place.place_id);
            if (!detailedPlace) return null;

            const getComponent = (type: string) => detailedPlace.address_components?.find(c => c.types.includes(type))?.long_name;
            const prospectSuburb = (getComponent('locality') || getComponent('postal_town') || '').toLowerCase();
            const prospectPostcode = (getComponent('postal_code') || '').toLowerCase();
            
            const isDuplicate = allMapData.some(existing => {
                const existingNameLower = existing.companyName.toLowerCase().replace(/[^a-z0-9]/gi, '');
                const coreNameToMatch = coreName.toLowerCase().replace(/[^a-z0-9]/gi, '');
                if (!existingNameLower.includes(coreNameToMatch)) return false;

                const existingCity = (existing.address?.city || '').trim().toLowerCase();
                const existingZip = (existing.address?.zip || '').trim().toLowerCase();
                
                if (!existingCity || !existingZip) return false;

                const isSuburbMatch = existingCity.includes(prospectSuburb) || prospectSuburb.includes(existingCity);
                const isPostcodeMatch = existingZip === prospectPostcode;

                return isSuburbMatch && isPostcodeMatch;
            });

            if (isDuplicate) {
                const existingLead = allMapData.find(l => {
                    const existingNameLower = l.companyName.toLowerCase().replace(/[^a-z0-9]/gi, '');
                    if (!existingNameLower.includes(coreName.toLowerCase().replace(/[^a-z0-9]/gi, ''))) return false;
                    const existingCity = (l.address?.city || '').trim().toLowerCase();
                    const existingZip = (l.address?.zip || '').trim().toLowerCase();
                    if (!existingCity || !existingZip) return false;
                    const isSuburbMatch = existingCity.includes(prospectSuburb) || prospectSuburb.includes(existingCity);
                    const isPostcodeMatch = existingZip === prospectPostcode;
                    return isSuburbMatch && isPostcodeMatch;
                });
                return { place: detailedPlace, existingLead: existingLead, classification: 'B2B', description: 'Existing lead/customer.' };
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
        
        setMapData(prev => prev.map(c => updatedCompanyIds.includes(c.id) ? { ...c, lastProspected: new Date().toISOString() } : c));
        
        const finalProspects = Array.from(allFoundProspects.values());
        setProspects(finalProspects);
        setIsSearchingNearby(false);

        if (finalProspects.length > 0) {
            setIsProspectsDialogOpen(true);
        } else {
            toast({ variant: "destructive", title: "Bulk Search Complete", description: "No new unique prospects found." });
        }
        setMapSelectedCompanyIds([]);
    }, [map, allMapData, getPlaceDetails, toast]);
  
  const handleFindSimilar = useCallback(async () => {
    if (!selectedLead) return;
    await handleBulkFindSimilar([selectedLead.id]);
    setSelectedLead(null);
  }, [selectedLead, handleBulkFindSimilar]);

  const handleFindMultiSites = useCallback(() => {
    if (!selectedLead) return;
    findProspects({ lat: -25.2744, lng: 133.7751 }, selectedLead.companyName, true);
    setSelectedLead(null);
  }, [selectedLead, findProspects]);

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
    
    const addressData: Partial<Address> = { country: 'Australia' };
    if (place.address_components) {
        const get = (type: string, useShortName = false) => {
            const comp = place.address_components?.find(c => c.types.includes(type));
            return useShortName ? comp?.short_name : comp?.long_name;
        };
        addressData.city = get('locality') || get('postal_town') || '';
        addressData.state = get('administrative_area_level_1', true) || '';
        addressData.zip = get('postal_code') || '';
    }
    addressData.street = place.vicinity;

    const newLeadData = {
        companyName: place.name,
        websiteUrl: place.website || '',
        campaign: leadCampaign,
        address: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            ...addressData,
        } as Address,
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
        const result = await createNewLead(newLeadData as any);
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
            setMapData(prev => [...prev, newMapLead]);
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
  
   const onDrawingComplete = (overlay: google.maps.Circle | google.maps.Rectangle | google.maps.Polygon) => {
        const companiesInArea = allMapData.filter(company => {
            if (company.latitude && company.longitude) {
                const companyLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
                if ('getBounds' in overlay) { // Circle or Rectangle
                    return (overlay as google.maps.Circle | google.maps.Rectangle).getBounds()!.contains(companyLatLng);
                } else { // Polygon
                    return google.maps.geometry.poly.containsLocation(companyLatLng, overlay as google.maps.Polygon);
                }
            }
            return false;
        });

        setSelectedRouteLeads(prev => [...new Set([...prev, ...companiesInArea])]);
        
        toast({
          title: `${companiesInArea.length} Leads Added`,
          description: "Leads in the drawn area have been added to your route.",
        });
        
        (overlay as any).setMap(null);
        setDrawingMode(null);
        setIsDrawing(false);
    };

    const startDrawing = (mode: string) => {
        if (!isLoaded) return;
        setIsDrawing(true);
        setDrawingMode(mode as google.maps.drawing.OverlayType);
        toast({
            title: "Drawing Mode Activated",
            description: `Draw a ${mode.toLowerCase()} on the map to select leads. Press Esc or click Cancel to exit.`,
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

    const MapContent = isLoaded ? (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={5}
            onLoad={onMapLoad}
            onUnmount={onUnmount}
            onClick={onMapClick}
            options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
            }}
        >
             {isDrawing && drawingMode && (
                <DrawingManagerF
                    onLoad={(dm) => (drawingManagerRef.current = dm)}
                    onCircleComplete={(c) => onDrawingComplete(c)}
                    onRectangleComplete={(r) => onDrawingComplete(r)}
                    onPolygonComplete={(p) => onDrawingComplete(p)}
                    drawingMode={drawingMode as google.maps.drawing.OverlayType}
                    options={{
                        drawingControl: false,
                        circleOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                        rectangleOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                        polygonOptions: { fillColor: '#8884d8', fillOpacity: 0.2, strokeColor: '#8884d8', strokeWeight: 2, clickable: false, editable: false, zIndex: 1, },
                    }}
                />
            )}
            {drawnOverlay && 'getBounds' in drawnOverlay && (
                <RectangleF
                    bounds={(drawnOverlay as google.maps.Rectangle).getBounds()!}
                    options={{ fillColor: "#4285F4", fillOpacity: 0.2, strokeColor: "#4285F4", strokeWeight: 2 }}
                />
            )}
            {drawnOverlay && 'getPaths' in drawnOverlay && (
                <PolygonF
                    paths={(drawnOverlay as google.maps.Polygon).getPaths().getArray().map(p => p.getArray())}
                    options={{ fillColor: "#4285F4", fillOpacity: 0.2, strokeColor: "#4285F4", strokeWeight: 2 }}
                />
            )}

            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#095c7b', strokeWeight: 6, strokeOpacity: 0.8, }, }} />}
            
            {myLocation && <MarkerF position={myLocation} title="Your Location" icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }} />}
            
            {allMapData.map(lead => (
                <MarkerF
                    key={lead.id}
                    position={{ lat: lead.latitude!, lng: lead.longitude! }}
                    onClick={() => onMarkerClick(lead)}
                    onMouseOver={() => setHoveredLeadId(lead.id)}
                    onMouseOut={() => setHoveredLeadId(null)}
                    icon={getPinIcon(lead.status, mapSelectedCompanyIds.includes(lead.id) || selectedRouteLeads.some(l => l.id === lead.id), hoveredLeadId === lead.id)}
                    visible={isMultiSelectMode ? lead.isCompany : true}
                />
            ))}

            {selectedLead && (
                <InfoWindowF
                    position={{ lat: Number(selectedLead.latitude!), lng: Number(selectedLead.longitude!) }}
                    onCloseClick={onInfoWindowClose}
                    options={infoWindowOptions}
                >
                    <div className="p-1 max-w-xs">
                        <h3 className="font-bold text-base mb-1">{selectedLead.companyName}</h3>
                        <div className="text-sm space-y-2">
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <p className="text-muted-foreground">
                                    {formatAddressDisplay(selectedLead.address as Address)}
                                </p>
                            </div>
                             <div className="flex items-center gap-2">
                                <LeadStatusBadge status={selectedLead.status} />
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                {selectionMode === 'select' && !selectedLead.isCompany && (
                                     <Button size="sm" onClick={() => { setSelectedRouteLeads(prev => prev.find(l => l.id === selectedLead.id) ? prev.filter(l => l.id !== selectedLead.id) : [...prev, selectedLead]); onInfoWindowClose(); }}>
                                        <Route className="mr-2" />
                                        {selectedRouteLeads.some(l => l.id === selectedLead.id) ? 'Remove from Route' : 'Add to Route'}
                                    </Button>
                                )}
                                {(selectionMode === 'info') && (
                                    <Button size="sm" asChild>
                                        <Link href={selectedLead.isCompany ? `/companies/${selectedLead.id}` : `/leads/${selectedLead.id}`} target="_blank">
                                            <ExternalLink className="mr-2" /> View {selectedLead.isCompany ? 'Company' : 'Lead'}
                                        </Link>
                                    </Button>
                                )}
                                 {selectedLead.isCompany && (
                                    <>
                                        <Button size="sm" variant="secondary" onClick={handleFindNearbyLeads} disabled={isFindingNearby && findingNearbyFor?.id === selectedLead.id}>
                                            {isFindingNearby && findingNearbyFor?.id === selectedLead.id ? <Loader/> : <Search className="mr-2 h-4 w-4" />}
                                            Nearby Leads
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={handleFindSimilar} disabled={isSearchingNearby || (selectedLead.lastProspected && isToday(new Date(selectedLead.lastProspected)))}>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            {isSearchingNearby ? 'Searching...' : 'AI Find Similar'}
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={handleFindMultiSites}>
                                            <Building className="mr-2 h-4 w-4" /> Find Multi-sites
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </InfoWindowF>
            )}
        </GoogleMap>
    ) : (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {loadError ? 'Error loading map' : <Loader />}
      </div>
    );
    
    if (authLoading || loadingData) {
        return <FullScreenLoader message="Loading Map Data..." />;
    }

    return (
        <>
            <div className="flex flex-col h-full gap-4">
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 flex flex-col">
                        <Card className="w-full flex flex-col flex-grow">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                                <CardHeader className="pb-2 flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                        <CardTitle>
                                            {isRouteActive && loadedRoute ? loadedRoute.name : 'Map Controls'}
                                        </CardTitle>
                                        {isRouteActive && (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="destructive">Active Route</Badge>
                                                <Button variant="ghost" size="icon" onClick={handleStopRoute}>
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <TabsList className="grid w-full grid-cols-2 mt-2">
                                        <TabsTrigger value="route-planner">Route Planner</TabsTrigger>
                                        <TabsTrigger value="prospecting">Prospecting</TabsTrigger>
                                    </TabsList>
                                </CardHeader>
                                
                                <TabsContent value="route-planner" className="flex-grow overflow-hidden flex flex-col">
                                    <CardContent className="flex-grow overflow-y-auto space-y-4">
                                        <div className="space-y-2">
                                            <Label>Selection Mode</Label>
                                            <div className="flex gap-2">
                                                <Button variant={selectionMode === 'info' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('info')} className="w-full"><Info className="mr-2" /> Info</Button>
                                                <Button variant={selectionMode === 'select' ? 'secondary' : 'outline'} onClick={() => setSelectionMode('select')} className="w-full"><PlusCircle className="mr-2" /> Select</Button>
                                            </div>
                                        </div>
                                         <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label>Stops ({selectedRouteLeads.length})</Label>
                                                <div className="flex gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm" disabled={isDrawing}>
                                                                <PenSquare className="mr-2 h-4 w-4" />
                                                                Draw to Select
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => startDrawing('RECTANGLE')}><RectangleHorizontal className="mr-2 h-4 w-4" />Rectangle</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => startDrawing('POLYGON')}><Spline className="mr-2 h-4 w-4" />Polygon</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                    {isDrawing && (<Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>)}
                                                </div>
                                            </div>
                                            <ScrollArea className="h-40 border rounded-md p-2">
                                                {selectedRouteLeads.length > 0 ? (
                                                    selectedRouteLeads.map((lead, index) => (
                                                    <div key={lead.id + index} className="flex items-center justify-between p-1 hover:bg-muted rounded text-sm">
                                                        <span className="truncate pr-2">{index + 1}. {lead.companyName}</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedRouteLeads(prev => prev.filter(l => l.id !== lead.id))}><X className="h-3 w-3"/></Button>
                                                    </div>
                                                ))
                                                ) : <div className="text-sm text-center text-muted-foreground pt-4">Click on the map to add stops.</div>}
                                            </ScrollArea>
                                            <Button variant="outline" size="sm" onClick={handleClearRoute} disabled={selectedRouteLeads.length === 0}>Clear All Stops</Button>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-semibold">Route Options</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="start-point">Start Point (Optional)</Label>
                                                    <Input ref={startPointRef} id="start-point" placeholder="e.g. Your office" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="end-point">End Point (Optional)</Label>
                                                    <Input ref={endPointRef} id="end-point" placeholder="e.g. Home" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Travel Mode</Label>
                                                <Select value={travelMode as string} onValueChange={(value) => setTravelMode(value as google.maps.TravelMode)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="DRIVING">Driving</SelectItem>
                                                        <SelectItem value="WALKING">Walking</SelectItem>
                                                        <SelectItem value="BICYCLING">Bicycling</SelectItem>
                                                        <SelectItem value="TRANSIT">Transit</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-2 pt-4 border-t flex-shrink-0">
                                        <Button onClick={handleCalculateRoute} disabled={selectedRouteLeads.length < 1 || isCalculatingRoute} className="w-full">
                                            {isCalculatingRoute ? <Loader /> : 'Calculate Route'}
                                        </Button>
                                        {directions && (
                                            <div className="space-y-4 w-full">
                                                <div className="flex justify-around w-full text-center text-sm p-2 bg-muted rounded-md">
                                                    <div className="flex items-center gap-2">
                                                        <Milestone className="h-4 w-4 text-muted-foreground"/>
                                                        <div>
                                                            <p className="font-semibold">{totalDistance}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground"/>
                                                        <div>
                                                            <p className="font-semibold">{totalDuration}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="outline" onClick={() => setIsSaveRouteDialogOpen(true)} className="w-full">
                                                    <Save className="mr-2 h-4 w-4"/>Save Route
                                                </Button>
                                            </div>
                                        )}
                                    </CardFooter>
                                </TabsContent>

                                <TabsContent value="prospecting" className="flex-grow overflow-hidden flex flex-col">
                                    <CardContent className="flex-grow overflow-y-auto space-y-4">
                                        <Button className="w-full" onClick={() => router.push('/leads/new')}><PlusCircle className="mr-2 h-4 w-4" /> Manually Add Lead</Button>
                                        <div className="relative my-4">
                                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
                                        </div>
                                        <h4 className="font-semibold text-center">Create Prospecting Area</h4>
                                        <Tabs defaultValue={activeProspectingTab} onValueChange={setActiveProspectingTab} className="w-full">
                                            <TabsList className="grid w-full grid-cols-2 mt-2">
                                                <TabsTrigger value="by-drawing">By Drawing</TabsTrigger>
                                                <TabsTrigger value="by-street">By Street</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="by-drawing" className="space-y-4 pt-4">
                                                 <div className="flex gap-2">
                                                    <Button variant={drawingMode === 'RECTANGLE' ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing('RECTANGLE')} disabled={isDrawing}>
                                                        <RectangleHorizontal className="mr-2"/> Rectangle
                                                    </Button>
                                                    <Button variant={drawingMode === 'POLYGON' ? 'secondary' : 'outline'} size="sm" className="flex-1" onClick={() => startDrawing('POLYGON')} disabled={isDrawing}>
                                                        <Spline className="mr-2"/> Polygon
                                                    </Button>
                                                    {isDrawing && (<Button variant="ghost" size="icon" onClick={cancelDrawing}><X className="h-4 w-4 text-destructive"/></Button>)}
                                                </div>
                                                {areaLeads.length > 0 && <p className="text-sm text-center font-semibold">{areaLeads.length} leads selected in drawn area.</p>}
                                            </TabsContent>
                                            <TabsContent value="by-street" className="space-y-4 pt-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="street-search">Street Name</Label>
                                                    <Input ref={streetInputRef} id="street-search" placeholder="e.g., George St, Sydney..." />
                                                </div>
                                                <ScrollArea className="h-24 border rounded-md">
                                                    <div className="p-2 text-sm">
                                                    {streetsForArea.length > 0 ? (
                                                        streetsForArea.map(street => (
                                                            <div key={street.place_id} className="flex items-center justify-between p-1 hover:bg-muted rounded">
                                                                <span className="truncate pr-2">{street.description}</span>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStreetsForArea(prev => prev.filter(s => s.place_id !== street.place_id))}><X className="h-3 w-3"/></Button>
                                                            </div>
                                                        ))
                                                    ) : <p className="text-sm text-center text-muted-foreground py-4">Add one or more streets.</p>}
                                                    </div>
                                                </ScrollArea>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t flex-shrink-0">
                                        <Button onClick={() => setIsSaveAreaDialogOpen(true)} className="w-full" disabled={(!drawnOverlay && streetsForArea.length === 0) || isSavingArea}>
                                            {isSavingArea ? <Loader /> : <><LayoutGrid className="mr-2 h-4 w-4" /> Save as Prospecting Area</>}
                                        </Button>
                                    </CardFooter>
                                </TabsContent>
                            </Tabs>
                        </Card>
                    </div>
                     <div className="md:col-span-2 flex-grow min-h-[60vh] relative rounded-lg overflow-hidden border">
                        {MapContent}
                    </div>
                </div>
            </div>
             <Dialog open={isProspectsDialogOpen} onOpenChange={setIsProspectsDialogOpen}>
                <DialogContent className="w-[95vw] md:w-full max-w-4xl">
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
                                                    <Button size="sm" onClick={() => setProspectToCreate(prospectInfo.place)} disabled={prospectInfo.isAdding}>
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
                        <Button onClick={() => {
                            if(duplicateLeadId) {
                                router.push(`/leads/${duplicateLeadId}`);
                            }
                        }}>
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
             <Dialog open={isSaveAreaDialogOpen} onOpenChange={setIsSaveAreaDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Prospecting Area</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="area-name">Area Name</Label>
                    <Input id="area-name" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} />
                  </div>
                  {(userProfile?.role === 'admin' || userProfile?.role === 'Field Sales Admin') && (
                    <div className="space-y-2">
                        <Label htmlFor="area-assignee">Assign To</Label>
                         <Select value={newAreaAssignee} onValueChange={setNewAreaAssignee}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a user (defaults to you)" />
                            </SelectTrigger>
                            <SelectContent>
                                {allUsers.filter(u => u.role === 'Field Sales' || u.role === 'admin').map(user => (
                                    <SelectItem key={user.uid} value={user.uid}>
                                        {user.displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSaveAreaDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveProspectingArea} disabled={isSavingArea || !newAreaName}>
                    {isSavingArea ? <Loader /> : 'Save Area'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
    );
}
