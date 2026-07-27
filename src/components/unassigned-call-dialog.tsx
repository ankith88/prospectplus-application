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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Search, Link as LinkIcon, Building2, User, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnassignedCall {
  callId: string;
  phoneNumber: string;
  direction: string;
  duration: string;
  notes: string;
  author: string;
  email: string | null;
  date: string;
  aircallStatus?: string;
  recordingUrl?: string;
  recordingAssetUrl?: string;
  matches: Array<{
    id: string;
    type: "leads" | "companies";
    name: string;
    status: string;
  }>;
}

function SuggestedMatchesDialogSection({
  matches,
  onLink,
  isLinking
}: {
  matches: Array<{ id: string; type: "leads" | "companies"; name: string; status: string }>;
  onLink: (targetId: string, targetType: "leads" | "companies", targetName: string) => void;
  isLinking: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!matches || matches.length === 0) return null;

  const visibleMatches = expanded ? matches : matches.slice(0, 3);
  const hiddenCount = matches.length - 3;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Suggested Matches ({matches.length})
        </span>
        {matches.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-semibold text-[#095c7b] hover:underline flex items-center gap-1"
          >
            {expanded ? (
              <>Show fewer <ChevronUp className="h-3.5 w-3.5" /></>
            ) : (
              <>+{hiddenCount} more <ChevronDown className="h-3.5 w-3.5" /></>
            )}
          </button>
        )}
      </div>

      <div className={`grid gap-2 ${expanded && matches.length > 4 ? 'max-h-[200px] overflow-y-auto pr-1' : ''}`}>
        {visibleMatches.map((match) => (
          <div
            key={match.id}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-lg transition-all duration-200"
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {match.type === "companies" ? (
                <Building2 className="h-4.5 w-4.5 text-[#095c7b] shrink-0" />
              ) : (
                <User className="h-4.5 w-4.5 text-amber-600 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate" title={match.name}>{match.name}</p>
                <p className="text-xs text-slate-500 capitalize truncate">
                  {match.type.slice(0, -1)} • Status: {match.status || 'Active'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => onLink(match.id, match.type, match.name)}
              disabled={isLinking}
              size="sm"
              className="bg-[#095c7b] hover:bg-[#074b64] text-white flex items-center gap-1.5 px-3 py-1.5 shrink-0"
            >
              {isLinking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LinkIcon className="h-3.5 w-3.5" />
              )}
              Link
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UnassignedCallDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unassignedCalls, setUnassignedCalls] = useState<UnassignedCall[]>([]);
  const [currentCall, setCurrentCall] = useState<UnassignedCall | null>(null);
  const [deferredCallIds, setDeferredCallIds] = useState<string[]>([]);
  
  // Custom Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; type: "leads" | "companies"; name: string; status: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Subscribe to unassigned calls for the logged-in user
  useEffect(() => {
    if (!user) return;

    const q = query(collection(firestore, "unassigned_calls"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls: UnassignedCall[] = [];
      const userEmailLower = user.email?.toLowerCase();

      snapshot.forEach((doc) => {
        const data = doc.data() as UnassignedCall;
        const callEmailLower = data.email?.toLowerCase();

        // Only show pop-up alert to the specific agent who made/received the call
        if (callEmailLower && userEmailLower && callEmailLower === userEmailLower) {
          calls.push({ ...data, callId: doc.id });
        }
      });

      setUnassignedCalls(calls);
    }, (error) => {
      console.error("Unassigned call subscription error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync current call when list or deferred calls change
  useEffect(() => {
    const availableCalls = unassignedCalls.filter(c => !deferredCallIds.includes(c.callId));
    if (availableCalls.length > 0) {
      if (!currentCall || !availableCalls.some(c => c.callId === currentCall.callId)) {
        setCurrentCall(availableCalls[0]);
      }
    } else {
      setCurrentCall(null);
    }
  }, [unassignedCalls, deferredCallIds, currentCall]);

  // Handle custom search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (!res.ok) throw new Error("Search request failed");
        const data = await res.json();
        const results = (data.results || []).map((item: any) => ({
          id: item.id,
          type: item.type === 'lead' ? 'leads' : 'companies',
          name: item.title,
          status: item.description
        }));
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleLink = async (targetId: string, targetType: "leads" | "companies", targetName: string) => {
    if (!currentCall) return;
    setIsLinking(true);

    try {
      // 1. Write activity to lead/company
      const activityRef = doc(firestore, targetType, targetId, "activity", currentCall.callId);
      
      const activityData = {
        type: "Call",
        date: currentCall.date,
        duration: currentCall.duration,
        notes: currentCall.notes,
        callId: currentCall.callId,
        author: currentCall.author,
        aircallStatus: currentCall.aircallStatus,
        recordingUrl: currentCall.recordingUrl || "",
        recordingAssetUrl: currentCall.recordingAssetUrl || "",
        event: "call.linked"
      };

      await setDoc(activityRef, activityData);

      // 2. Delete from unassigned_calls
      const unassignedRef = doc(firestore, "unassigned_calls", currentCall.callId);
      await deleteDoc(unassignedRef);

      toast({
        title: "Call Linked Successfully",
        description: `Associated call with ${targetName}`,
      });

      // Clear search
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to link call:", error);
      toast({
        variant: "destructive",
        title: "Linking Failed",
        description: "An error occurred while linking the call.",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleDismiss = async () => {
    if (!currentCall) return;
    try {
      const unassignedRef = doc(firestore, "unassigned_calls", currentCall.callId);
      await deleteDoc(unassignedRef);
      toast({
        title: "Call Dismissed",
        description: "Call was removed from your unassigned list.",
      });
    } catch (error) {
      console.error("Failed to dismiss call:", error);
    }
  };

  const handleDecideLater = () => {
    // Defer all currently loaded unassigned calls so closing the pop-up closes it completely for the session
    const allPendingIds = unassignedCalls.map(c => c.callId);
    setDeferredCallIds((prev) => Array.from(new Set([...prev, ...allPendingIds])));
    setCurrentCall(null);
  };

  if (!currentCall) return null;

  const availableCalls = unassignedCalls.filter(c => !deferredCallIds.includes(c.callId));
  const currentIndex = availableCalls.findIndex(c => c.callId === currentCall.callId);
  const totalCount = availableCalls.length;

  return (
    <Dialog open={!!currentCall} onOpenChange={(open) => !open && handleDecideLater()}>
      <DialogContent className="sm:max-w-[500px] border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader className="space-y-2 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[#095c7b]">
              <Phone className="h-5 w-5 animate-pulse" />
              <DialogTitle className="text-xl font-bold">Unassigned Call Detected</DialogTitle>
            </div>
            {totalCount > 1 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {currentIndex >= 0 ? currentIndex + 1 : 1} of {totalCount}
              </span>
            )}
          </div>
          <DialogDescription className="text-slate-500">
            A recent call to <strong className="text-slate-800 font-semibold">{currentCall.phoneNumber}</strong> ({currentCall.duration}) was completed but matches multiple entries. Please select where to log this call.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Matched Suggestion List */}
          <SuggestedMatchesDialogSection
            matches={currentCall.matches || []}
            onLink={handleLink}
            isLinking={isLinking}
          />

          {/* Search other leads option */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Or Search Other Leads/Companies</span>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by company name..."
                className="pl-9 pr-4 py-5 border-slate-200 focus-visible:ring-[#095c7b]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Custom Search Results */}
            {searchQuery && (
              <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50 shadow-inner bg-slate-50/50">
                {isSearching ? (
                  <div className="flex items-center justify-center py-6 text-sm text-slate-400 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#095c7b]" />
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400">No leads found matching "{searchQuery}"</div>
                ) : (
                  searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {result.type === "companies" ? (
                          <Building2 className="h-4.5 w-4.5 text-slate-400" />
                        ) : (
                          <User className="h-4.5 w-4.5 text-slate-400" />
                        )}
                        <div>
                          <p className="font-medium text-xs text-slate-800">{result.name}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{result.type.slice(0, -1)}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] h-7 px-2"
                        onClick={() => handleLink(result.id, result.type, result.name)}
                        disabled={isLinking}
                      >
                        Link
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-slate-100 gap-2">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-slate-600 text-xs px-2"
            onClick={handleDismiss}
          >
            Dismiss
          </Button>
          <Button
            variant="outline"
            className="border-slate-200 text-slate-600 text-xs"
            onClick={handleDecideLater}
          >
            Decide Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
