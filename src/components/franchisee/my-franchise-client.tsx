'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Franchisee, Operator, SuburbMapping } from '@/lib/types';
import { getOperatorsForFranchisee } from '@/services/firebase';
import { FranchiseeSwitcher } from '@/components/franchisee-switcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/ui/loader';
import { 
  Building2, 
  User, 
  MapPin, 
  Users, 
  Phone, 
  Mail, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Store,
  Briefcase,
  Layers,
  Truck
} from 'lucide-react';

import { AccessDenied } from '@/components/access-denied';

interface LodgementPoint {
  depotId: string;
  name: string;
  suburb: string;
  postcode: string;
  state: string;
  operators?: string[];
  operatorId?: string;
}

export default function MyFranchiseClient() {
  const { user, userProfile } = useAuth();
  
  const [franchiseeDoc, setFranchiseeDoc] = useState<Franchisee | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isFranchiseeRole = userProfile?.activeRole === 'Franchisee' || userProfile?.activeRole?.toLowerCase() === 'franchisee';

  if (userProfile && !isFranchiseeRole) {
    return <AccessDenied customPageName="My Franchise Profile" />;
  }

  // Active franchisee identification
  const currentFranId = useMemo(() => {
    if (!userProfile) return null;
    return userProfile.activeFranchiseeId || userProfile.franchiseeId || userProfile.franchiseeInternalId || null;
  }, [userProfile]);

  const activeFranName = useMemo(() => {
    if (!userProfile) return 'Franchise';
    const linked = userProfile.linkedFranchisees || [];
    const active = linked.find(f => f.franchiseeId === currentFranId);
    return active?.franchiseeName || userProfile.franchisee || 'My Franchise';
  }, [userProfile, currentFranId]);

  useEffect(() => {
    async function loadFranchiseeData() {
      setLoading(true);
      try {
        let fDocData: Franchisee | null = null;

        if (currentFranId) {
          // 1. Try directly fetching by document ID
          const docRef = doc(firestore, 'franchisees', String(currentFranId));
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            fDocData = { id: snap.id, ...snap.data() } as Franchisee;
          } else {
            // 2. Query by internalId field
            const q = query(collection(firestore, 'franchisees'), where('internalId', '==', String(currentFranId)));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              fDocData = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as Franchisee;
            }
          }
        }

        // 3. Fallback search by franchisee name
        if (!fDocData && userProfile?.franchisee) {
          const qName = query(collection(firestore, 'franchisees'), where('name', '==', userProfile.franchisee));
          const qSnap = await getDocs(qName);
          if (!qSnap.empty) {
            fDocData = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as Franchisee;
          }
        }

        setFranchiseeDoc(fDocData);

        // Fetch Operators linked to this franchise
        const effectiveId = fDocData?.internalId || fDocData?.id || currentFranId;
        if (effectiveId) {
          const ops = await getOperatorsForFranchisee(String(effectiveId));
          setOperators(ops);
        } else {
          setOperators([]);
        }
      } catch (err) {
        console.error('Error loading franchisee data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userProfile) {
      loadFranchiseeData();
    }
  }, [userProfile, currentFranId]);

  // Extract suburbs list safely
  const mainTerritorySuburbs = useMemo(() => {
    const list = franchiseeDoc?.territoryJson || [];
    if (!Array.isArray(list)) return [];
    return list;
  }, [franchiseeDoc]);

  const starTrackSuburbs = useMemo(() => {
    const list = franchiseeDoc?.starTrackSuburbsJson || [];
    if (!Array.isArray(list)) return [];
    return list;
  }, [franchiseeDoc]);

  const tgeSuburbs = useMemo(() => {
    const list = franchiseeDoc?.tgeSuburbsJSON || [];
    if (!Array.isArray(list)) return [];
    return list;
  }, [franchiseeDoc]);

  const ironMountainSuburbs = useMemo(() => {
    const list = franchiseeDoc?.ironMountainSuburbsJson || [];
    if (!Array.isArray(list)) return [];
    return list;
  }, [franchiseeDoc]);

  const ausPostSuburbs = useMemo(() => {
    const list = franchiseeDoc?.ausPostSuburbsJson || [];
    if (!Array.isArray(list)) return [];
    return list;
  }, [franchiseeDoc]);

  // Extract lodgement points safely
  const expressLodgementPoints = useMemo(() => {
    const raw = franchiseeDoc?.mpExpressLodgementPoints;
    if (Array.isArray(raw)) return raw as LodgementPoint[];
    return [];
  }, [franchiseeDoc]);

  const starTrackLodgementPoints = useMemo(() => {
    const raw = franchiseeDoc?.starTrackLodgementPoints;
    if (Array.isArray(raw)) return raw as LodgementPoint[];
    return [];
  }, [franchiseeDoc]);

  // Filter suburbs by search query
  const filterSuburbs = (suburbs: SuburbMapping[]) => {
    if (!searchQuery.trim()) return suburbs;
    const q = searchQuery.toLowerCase().trim();
    return suburbs.filter(s => 
      (s.suburbs && s.suburbs.toLowerCase().includes(q)) ||
      (s.post_code && String(s.post_code).includes(q)) ||
      (s.state && s.state.toLowerCase().includes(q)) ||
      (s.primary_op && Array.isArray(s.primary_op) && s.primary_op.some(op => op.toLowerCase().includes(q)))
    );
  };

  const totalSuburbsCount = mainTerritorySuburbs.length + starTrackSuburbs.length + tgeSuburbs.length + ironMountainSuburbs.length + ausPostSuburbs.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader className="h-8 w-8 text-[#095c7b]" />
        <p className="text-sm font-medium text-slate-500">Loading your franchise profile & territory details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#095c7b] via-[#074760] to-[#042f40] text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Store className="h-6 w-6 text-[#eaf143]" />
            <h1 className="text-2xl font-extrabold tracking-tight">
              {activeFranName}
            </h1>
            <Badge className="bg-[#eaf143] text-[#095c7b] hover:bg-[#eaf143] font-bold text-xs">
              {userProfile?.franchiseeRole ? userProfile.franchiseeRole.toUpperCase() : 'FRANCHISEE'}
            </Badge>
          </div>
          <p className="text-slate-200 text-xs flex items-center gap-3 pt-1">
            <span><strong>ID:</strong> {franchiseeDoc?.internalId || currentFranId || 'N/A'}</span>
            <span>•</span>
            <span><strong>Contact:</strong> {franchiseeDoc?.mainContact || userProfile?.name || 'N/A'}</span>
            <span>•</span>
            <span><strong>Email:</strong> {franchiseeDoc?.email || userProfile?.email || 'N/A'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FranchiseeSwitcher />
        </div>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg text-[#095c7b]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Main Territory Suburbs</p>
              <p className="text-xl font-bold text-slate-800">{mainTerritorySuburbs.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Operators</p>
              <p className="text-xl font-bold text-slate-800">{operators.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Lodgement Depots</p>
              <p className="text-xl font-bold text-slate-800">{expressLodgementPoints.length + starTrackLodgementPoints.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Mapped Suburbs</p>
              <p className="text-xl font-bold text-slate-800">{totalSuburbsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="profile" className="flex items-center gap-2 text-xs font-semibold">
            <User className="h-4 w-4" />
            User Profile & Franchise Overview
          </TabsTrigger>
          <TabsTrigger value="suburbs" className="flex items-center gap-2 text-xs font-semibold">
            <MapPin className="h-4 w-4" />
            Suburb Mappings ({totalSuburbsCount})
          </TabsTrigger>
          <TabsTrigger value="operators" className="flex items-center gap-2 text-xs font-semibold">
            <Users className="h-4 w-4" />
            Operator Details ({operators.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: User Profile & Franchise Overview */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Profile Linked Details */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <User className="h-4 w-4 text-[#095c7b]" />
                  User Account & Profile Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Personal credentials and attributes linked to your user login profile
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Full Name</span>
                    <span className="font-medium text-slate-800">{userProfile?.name || user?.displayName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Login Email</span>
                    <span className="font-medium text-slate-800">{userProfile?.email || user?.email || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Phone Number</span>
                    <span className="font-medium text-slate-800">{userProfile?.mobileNumber || userProfile?.phoneNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Personal Email</span>
                    <span className="font-medium text-slate-800">{userProfile?.personalEmail || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Active System Role</span>
                    <Badge variant="outline" className="font-semibold text-xs mt-0.5 border-[#095c7b] text-[#095c7b] bg-[#095c7b]/5">
                      {userProfile?.activeRole || 'Franchisee'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Franchisee Relationship</span>
                    <Badge className="font-semibold text-xs mt-0.5 capitalize bg-emerald-600">
                      {userProfile?.franchiseeRole || 'Owner'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">ABN</span>
                    <span className="font-mono text-xs font-medium text-slate-800">{userProfile?.abn || franchiseeDoc?.prospectPlusId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Address Details</span>
                    <span className="text-xs font-medium text-slate-800">
                      {userProfile?.addressDetails ? (
                        `${userProfile.addressDetails.street || ''} ${userProfile.addressDetails.suburb || ''} ${userProfile.addressDetails.state || ''} ${userProfile.addressDetails.postcode || ''}`.trim() || 'N/A'
                      ) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Franchise Operating Info */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <Building2 className="h-4 w-4 text-[#095c7b]" />
                  Franchise Entity Information
                </CardTitle>
                <CardDescription className="text-xs">
                  Official franchise record details stored in the network directory
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Franchise Name</span>
                    <span className="font-bold text-[#095c7b]">{franchiseeDoc?.name || activeFranName}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Internal Franchise ID</span>
                    <span className="font-mono font-medium text-slate-800">{franchiseeDoc?.internalId || currentFranId || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Main Franchise Contact</span>
                    <span className="font-medium text-slate-800">{franchiseeDoc?.mainContact || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Franchise Mobile / Phone</span>
                    <span className="font-medium text-slate-800">{franchiseeDoc?.mobile || 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Assigned Sales Rep</span>
                    <span className="font-medium text-slate-800">{franchiseeDoc?.salesRepAssigned || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Company Owned</span>
                    <span className="font-medium text-slate-800">
                      {franchiseeDoc?.isCompanyOwned ? (
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600">No (Franchised)</Badge>
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">MailPlus Express</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium mt-1">
                      {franchiseeDoc?.mpExpressActivated ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-semibold"><CheckCircle2 className="h-4 w-4" /> Activated</span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Inactive</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">StarTrack Parcel Service</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium mt-1">
                      {franchiseeDoc?.mpStarTrackActivated ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-semibold"><CheckCircle2 className="h-4 w-4" /> Activated</span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Inactive</span>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Suburb & Lodgement Mappings */}
        <TabsContent value="suburbs" className="space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#095c7b]" />
                  Territory Suburbs & Lodgement Points
                </CardTitle>
                <CardDescription className="text-xs">
                  Suburbs, postcodes, and lodgement depots assigned to your franchise territory
                </CardDescription>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search suburb or postcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <Tabs defaultValue="main-territory">
                <TabsList className="bg-slate-100 p-1 mb-4 flex-wrap">
                  <TabsTrigger value="main-territory" className="text-xs font-medium">
                    Main Territory ({filterSuburbs(mainTerritorySuburbs).length})
                  </TabsTrigger>
                  <TabsTrigger value="startrack" className="text-xs font-medium">
                    StarTrack ({filterSuburbs(starTrackSuburbs).length})
                  </TabsTrigger>
                  <TabsTrigger value="tge" className="text-xs font-medium">
                    TGE ({filterSuburbs(tgeSuburbs).length})
                  </TabsTrigger>
                  <TabsTrigger value="auspost" className="text-xs font-medium">
                    AusPost ({filterSuburbs(ausPostSuburbs).length})
                  </TabsTrigger>
                  <TabsTrigger value="lodgement" className="text-xs font-medium">
                    Lodgement Depots ({expressLodgementPoints.length + starTrackLodgementPoints.length})
                  </TabsTrigger>
                </TabsList>

                {/* Suburb Table Template Helper */}
                {['main-territory', 'startrack', 'tge', 'auspost'].map((subTabKey) => {
                  const rawList = 
                    subTabKey === 'main-territory' ? mainTerritorySuburbs :
                    subTabKey === 'startrack' ? starTrackSuburbs :
                    subTabKey === 'tge' ? tgeSuburbs : ausPostSuburbs;

                  const filteredList = filterSuburbs(rawList);

                  return (
                    <TabsContent key={subTabKey} value={subTabKey}>
                      {filteredList.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                          <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-medium text-slate-500">No suburb mappings found for this category.</p>
                        </div>
                      ) : (
                        <div className="border rounded-md overflow-hidden max-h-[500px] overflow-y-auto">
                          <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                              <TableRow>
                                <TableHead className="text-xs font-bold">Suburb</TableHead>
                                <TableHead className="text-xs font-bold">Postcode</TableHead>
                                <TableHead className="text-xs font-bold">State</TableHead>
                                <TableHead className="text-xs font-bold">Primary Operator</TableHead>
                                <TableHead className="text-xs font-bold">Secondary Operator</TableHead>
                                <TableHead className="text-xs font-bold">Next Day</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredList.map((item, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50">
                                  <TableCell className="font-semibold text-xs text-slate-800">{item.suburbs}</TableCell>
                                  <TableCell className="font-mono text-xs text-slate-700">{item.post_code}</TableCell>
                                  <TableCell className="text-xs font-medium text-slate-600">{item.state}</TableCell>
                                  <TableCell className="text-xs text-slate-700">
                                    {Array.isArray(item.primary_op) && item.primary_op.length > 0 ? (
                                      item.primary_op.map((op, i) => (
                                        <Badge key={i} variant="outline" className="mr-1 text-[11px] bg-blue-50 text-blue-700 border-blue-200">
                                          {op}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 italic">Unassigned</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-600">
                                    {typeof item.secondary_op === 'string' 
                                      ? item.secondary_op 
                                      : Array.isArray(item.secondary_op) 
                                      ? (item.secondary_op as string[]).join(', ') 
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {item.next_day === true ? (
                                      <Badge className="bg-emerald-600 text-white text-[10px]">Yes</Badge>
                                    ) : item.next_day === false ? (
                                      <Badge variant="outline" className="text-slate-500 text-[10px]">No</Badge>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}

                {/* Lodgement Depots Sub-tab */}
                <TabsContent value="lodgement">
                  <div className="space-y-6">
                    {/* Express Depots */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-[#095c7b]" /> Express Lodgement Depots ({expressLodgementPoints.length})
                      </h4>
                      {expressLodgementPoints.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No Express lodgement points defined.</p>
                      ) : (
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="text-xs font-bold">Depot Name / ID</TableHead>
                                <TableHead className="text-xs font-bold">Suburb</TableHead>
                                <TableHead className="text-xs font-bold">Postcode</TableHead>
                                <TableHead className="text-xs font-bold">State</TableHead>
                                <TableHead className="text-xs font-bold">Assigned Operators</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expressLodgementPoints.map((depot, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-semibold text-xs text-slate-800">{depot.name || depot.depotId}</TableCell>
                                  <TableCell className="text-xs">{depot.suburb}</TableCell>
                                  <TableCell className="font-mono text-xs">{depot.postcode}</TableCell>
                                  <TableCell className="text-xs">{depot.state}</TableCell>
                                  <TableCell className="text-xs">
                                    {depot.operators && depot.operators.length > 0 ? (
                                      depot.operators.map((op, i) => (
                                        <Badge key={i} variant="outline" className="mr-1 text-[10px] bg-slate-100">
                                          {op}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 italic">All operators</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* StarTrack Depots */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-amber-600" /> StarTrack Lodgement Depots ({starTrackLodgementPoints.length})
                      </h4>
                      {starTrackLodgementPoints.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No StarTrack lodgement points defined.</p>
                      ) : (
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="text-xs font-bold">Depot Name / ID</TableHead>
                                <TableHead className="text-xs font-bold">Suburb</TableHead>
                                <TableHead className="text-xs font-bold">Postcode</TableHead>
                                <TableHead className="text-xs font-bold">State</TableHead>
                                <TableHead className="text-xs font-bold">Assigned Operators</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {starTrackLodgementPoints.map((depot, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-semibold text-xs text-slate-800">{depot.name || depot.depotId}</TableCell>
                                  <TableCell className="text-xs">{depot.suburb}</TableCell>
                                  <TableCell className="font-mono text-xs">{depot.postcode}</TableCell>
                                  <TableCell className="text-xs">{depot.state}</TableCell>
                                  <TableCell className="text-xs">
                                    {depot.operators && depot.operators.length > 0 ? (
                                      depot.operators.map((op, i) => (
                                        <Badge key={i} variant="outline" className="mr-1 text-[10px] bg-slate-100">
                                          {op}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 italic">All operators</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Operator Details */}
        <TabsContent value="operators" className="space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#095c7b]" />
                Assigned Franchise Operators ({operators.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Driver and delivery operators associated with your franchise runs
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4">
              {operators.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">No Operators Found</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    No active operator records are linked to your franchise ID ({currentFranId}).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {operators.map((op) => (
                    <Card key={op.internalId} className="border border-slate-200 shadow-sm hover:shadow transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-[#095c7b]/10 text-[#095c7b] font-bold text-sm flex items-center justify-center">
                              {op.givenNames?.[0] || 'O'}{op.surname?.[0] || ''}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800">
                                {op.title ? `${op.title} ` : ''}{op.givenNames} {op.surname}
                              </h4>
                              <p className="text-xs text-slate-500 font-mono">Code: {op.internalId}</p>
                            </div>
                          </div>

                          <Badge className={op.operatorStatus === 'Active' || !op.operatorStatus ? 'bg-emerald-600 text-white text-[10px]' : 'bg-slate-200 text-slate-700 text-[10px]'}>
                            {op.operatorStatus || 'Active'}
                          </Badge>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                          {op.contactPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{op.contactPhone}</span>
                            </div>
                          )}
                          {op.contactEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{op.contactEmail}</span>
                            </div>
                          )}
                          {op.employment && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Employment: {op.employment}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
