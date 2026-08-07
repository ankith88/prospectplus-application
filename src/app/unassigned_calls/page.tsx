"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  limit
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Search, Link as LinkIcon, Building2, User, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface UnassignedCall {
  callId: string;
  phoneNumber: string;
  direction: string;
  duration: string;
  notes: string;
  author: string;
  email: string | null;
  date: string;
  matches: Array<{
    id: string;
    type: "leads" | "companies";
    name: string;
    status: string;
  }>;
}

function SuggestedMatchesCell({
  matches,
  onLink,
  linkingCallId,
  callId
}: {
  matches: Array<{ id: string; type: "leads" | "companies"; name: string; status: string }>;
  onLink: (targetId: string, targetType: "leads" | "companies", targetName: string) => void;
  linkingCallId: string | null;
  callId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!matches || matches.length === 0) {
    return <span className="text-xs text-slate-400">No suggestions found</span>;
  }

  const visibleMatches = expanded ? matches : matches.slice(0, 2);
  const hiddenCount = matches.length - 2;

  return (
    <div className="space-y-1.5 max-w-xs">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pb-0.5">
        <span>{matches.length} Suggestion{matches.length !== 1 ? 's' : ''}</span>
        {matches.length > 2 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-semibold text-[#095c7b] hover:underline flex items-center gap-0.5"
          >
            {expanded ? (
              <>Show less <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>+{hiddenCount} more <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </div>

      <div className={`space-y-1.5 ${expanded && matches.length > 3 ? 'max-h-[180px] overflow-y-auto pr-1' : ''}`}>
        {visibleMatches.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between p-2 border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 rounded-lg text-xs transition-colors"
          >
            <div className="space-y-0.5 max-w-[160px]">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5 truncate" title={m.name}>
                {m.type === "companies" ? (
                  <Building2 className="h-3.5 w-3.5 text-[#095c7b] shrink-0" />
                ) : (
                  <User className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                )}
                <span className="truncate">{m.name}</span>
              </p>
              <p className="text-[10px] text-slate-400 capitalize truncate">
                {m.type.slice(0, -1)} • {m.status || 'Active'}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-[#095c7b] hover:bg-[#074b64] text-white h-7 px-2 text-xs shrink-0 ml-2"
              onClick={() => onLink(m.id, m.type, m.name)}
              disabled={linkingCallId !== null}
            >
              {linkingCallId === callId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LinkIcon className="h-3 w-3 mr-1" />
              )}
              Link
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UnassignedCallsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [unassignedCalls, setUnassignedCalls] = useState<UnassignedCall[]>([]);
  const [loading, setLoading] = useState(true);

  const hasAccess = userProfile?.activeRole && ['admin', 'Marketing Manager', 'user', 'Outbound Admin', 'Lead Gen Admin', 'Sales Manager', 'Account Manager', 'Account Managers', 'account managers', 'Field Sales', 'Field Sales Admin'].includes(userProfile.activeRole);

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page. Please contact Ankith Ravindran if you need access.</p>
      </div>
    );
  }
  
  // Search state per callId
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, Array<{ id: string; type: "leads" | "companies"; name: string; status: string }>>>({});
  const [searchingIds, setSearchingIds] = useState<Record<string, boolean>>({});
  const [linkingCallId, setLinkingCallId] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<"all" | "my">("all");

  // Subscribe to unassigned calls
  useEffect(() => {
    if (!user) return;

    const q = query(collection(firestore, "unassigned_calls"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls: UnassignedCall[] = [];
      snapshot.forEach((doc) => {
        calls.push({ callId: doc.id, ...doc.data() } as UnassignedCall);
      });
      setUnassignedCalls(calls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    }, (error) => {
      console.error("Subscription failed:", error);
      toast({
        variant: "destructive",
        title: "Error Loading Unassigned Calls",
        description: error.message || "Failed to load calls queue from database.",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const userEmailLower = user?.email?.toLowerCase();
  const displayedCalls = unassignedCalls.filter(call => {
    if (filterMode === "my") {
      return !call.email || (call.email && userEmailLower && call.email.toLowerCase() === userEmailLower);
    }
    return true;
  });


  // Handle lead search per callId
  const handleSearch = async (callId: string, queryText: string) => {
    setSearchQueries(prev => ({ ...prev, [callId]: queryText }));
    
    if (queryText.trim().length < 2) {
      setSearchResults(prev => ({ ...prev, [callId]: [] }));
      return;
    }

    setSearchingIds(prev => ({ ...prev, [callId]: true }));
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryText.trim())}`);
      if (!res.ok) throw new Error("Search request failed");
      const data = await res.json();
      const results = (data.results || []).map((item: any) => ({
        id: item.id,
        type: item.type === 'lead' ? 'leads' : 'companies',
        name: item.title,
        status: item.description
      }));
      setSearchResults(prev => ({ ...prev, [callId]: results.slice(0, 5) }));
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchingIds(prev => ({ ...prev, [callId]: false }));
    }
  };

  const handleLink = async (call: UnassignedCall, targetId: string, targetType: "leads" | "companies", targetName: string) => {
    setLinkingCallId(call.callId);
    try {
      // 1. Write activity to selected lead/company
      const activityRef = doc(firestore, targetType, targetId, "activity", call.callId);
      await setDoc(activityRef, {
        type: "Call",
        date: call.date,
        duration: call.duration,
        notes: call.notes,
        callId: call.callId,
        author: call.author,
        aircallStatus: "done",
        recordingUrl: (call as any).recordingUrl || "",
        recordingAssetUrl: (call as any).recordingAssetUrl || "",
        event: "call.linked"
      });

      // 2. Remove from unassigned_calls
      await deleteDoc(doc(firestore, "unassigned_calls", call.callId));

      toast({
        title: "Call Linked Successfully",
        description: `Associated call with ${targetName}`,
      });
    } catch (err) {
      console.error("Failed to link call:", err);
      toast({
        variant: "destructive",
        title: "Linking Failed",
        description: "An error occurred while linking the call.",
      });
    } finally {
      setLinkingCallId(null);
    }
  };

  const handleDelete = async (callId: string) => {
    try {
      await deleteDoc(doc(firestore, "unassigned_calls", callId));
      toast({
        title: "Call Removed",
        description: "Unassigned call has been deleted from your list.",
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#095c7b] flex items-center gap-2">
          <Phone className="h-6 w-6" />
          Unassigned Calls Queue
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Calls that matched multiple leads or had no direct phone matching. Assign them to the correct record.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Calls Awaiting Action</CardTitle>
            <CardDescription>
              Showing {displayedCalls.length} of {unassignedCalls.length} call{unassignedCalls.length !== 1 && 's'} requiring manual linking.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <Button
              size="sm"
              variant={filterMode === "all" ? "default" : "ghost"}
              className={filterMode === "all" ? "bg-[#095c7b] hover:bg-[#074b64] text-white h-7 text-xs px-3" : "h-7 text-xs px-3 text-slate-600"}
              onClick={() => setFilterMode("all")}
            >
              All Calls ({unassignedCalls.length})
            </Button>
            <Button
              size="sm"
              variant={filterMode === "my" ? "default" : "ghost"}
              className={filterMode === "my" ? "bg-[#095c7b] hover:bg-[#074b64] text-white h-7 text-xs px-3" : "h-7 text-xs px-3 text-slate-600"}
              onClick={() => setFilterMode("my")}
            >
              My Calls
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {displayedCalls.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Phone className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No unassigned calls found</p>
              <p className="text-xs text-slate-400 mt-1">
                {filterMode === "my" ? "You have no unassigned calls waiting." : "Great job keeping your log clean."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead>Call Details</TableHead>
                    <TableHead>Suggested Matches</TableHead>
                    <TableHead>Custom Search Link</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedCalls.map((call) => (
                    <TableRow key={call.callId} className="border-slate-100 align-top hover:bg-slate-50/40">
                      <TableCell className="space-y-1.5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{call.phoneNumber}</span>
                          <Badge variant="outline" className="text-xs capitalize">{call.direction}</Badge>
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <p>Duration: <span className="font-medium text-slate-700">{call.duration}</span></p>
                          <p>Date: <span className="font-medium text-slate-700">{new Date(call.date).toLocaleString()}</span></p>
                          <p>Agent: <span className="font-medium text-slate-700">{call.author}</span></p>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <SuggestedMatchesCell
                          matches={call.matches || []}
                          onLink={(tId, tType, tName) => handleLink(call, tId, tType, tName)}
                          linkingCallId={linkingCallId}
                          callId={call.callId}
                        />
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-2 max-w-xs">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              placeholder="Search lead/company..."
                              className="pl-8 h-8 text-xs"
                              value={searchQueries[call.callId] || ""}
                              onChange={(e) => handleSearch(call.callId, e.target.value)}
                            />
                          </div>

                          {searchQueries[call.callId] && (
                            <div className="border border-slate-150 rounded-lg bg-white divide-y divide-slate-100 shadow-sm max-h-[120px] overflow-y-auto">
                              {searchingIds[call.callId] ? (
                                <div className="flex items-center justify-center p-3 text-xs text-slate-400 gap-1.5">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#095c7b]" />
                                  Searching...
                                </div>
                              ) : !searchResults[call.callId] || searchResults[call.callId].length === 0 ? (
                                <div className="p-3 text-center text-xs text-slate-400">No results found</div>
                              ) : (
                                searchResults[call.callId].map(res => (
                                  <div key={res.id} className="flex items-center justify-between p-2 text-[11px] hover:bg-slate-50 transition-colors">
                                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{res.name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-1.5 text-[#095c7b] hover:text-[#074b64] font-semibold"
                                      onClick={() => handleLink(call, res.id, res.type, res.name)}
                                      disabled={linkingCallId !== null}
                                    >
                                      Link
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(call.callId)}
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
        </CardContent>
      </Card>
    </div>
  );
}
