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
import { Phone, Search, Link as LinkIcon, Building2, User, Loader2 } from "lucide-react";
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
  matches: Array<{
    id: string;
    type: "leads" | "companies";
    name: string;
    status: string;
  }>;
}

export function UnassignedCallDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unassignedCalls, setUnassignedCalls] = useState<UnassignedCall[]>([]);
  const [currentCall, setCurrentCall] = useState<UnassignedCall | null>(null);
  
  // Custom Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; type: "leads" | "companies"; name: string; status: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Subscribe to unassigned calls for the logged-in user
  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(firestore, "unassigned_calls"),
      where("email", "==", user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls: UnassignedCall[] = [];
      snapshot.forEach((doc) => {
        calls.push({ callId: doc.id, ...doc.data() } as UnassignedCall);
      });
      setUnassignedCalls(calls);
      
      // Auto-open first unassigned call
      if (calls.length > 0 && !currentCall) {
        setCurrentCall(calls[0]);
      }
    });

    return () => unsubscribe();
  }, [user?.email, currentCall]);

  // Sync current call when list changes
  useEffect(() => {
    if (unassignedCalls.length > 0) {
      if (!currentCall || !unassignedCalls.some(c => c.callId === currentCall.callId)) {
        setCurrentCall(unassignedCalls[0]);
      }
    } else {
      setCurrentCall(null);
    }
  }, [unassignedCalls, currentCall]);

  // Handle custom search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results: typeof searchResults = [];
        
        // Search leads
        const leadsRef = collection(firestore, "leads");
        // Simple client-side search approximation by starting character or simple fetches
        const leadsSnap = await getDocs(query(leadsRef, limit(100)));
        leadsSnap.forEach(docSnap => {
          const data = docSnap.data();
          const companyName = data.companyName || "";
          if (companyName.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              id: docSnap.id,
              type: "leads",
              name: companyName,
              status: data.customerStatus || "New"
            });
          }
        });

        // Search companies
        const compRef = collection(firestore, "companies");
        const compSnap = await getDocs(query(compRef, limit(50)));
        compSnap.forEach(docSnap => {
          const data = docSnap.data();
          const name = data.companyName || "";
          if (name.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              id: docSnap.id,
              type: "companies",
              name: name,
              status: data.customerStatus || "Active"
            });
          }
        });

        setSearchResults(results.slice(0, 10));
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

  if (!currentCall) return null;

  return (
    <Dialog open={!!currentCall} onOpenChange={(open) => !open && setCurrentCall(null)}>
      <DialogContent className="sm:max-w-[500px] border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader className="space-y-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-[#095c7b]">
            <Phone className="h-5 w-5 animate-pulse" />
            <DialogTitle className="text-xl font-bold">Unassigned Call Detected</DialogTitle>
          </div>
          <DialogDescription className="text-slate-500">
            A recent call to <strong className="text-slate-800 font-semibold">{currentCall.phoneNumber}</strong> ({currentCall.duration}) was completed but matches multiple entries. Please select where to log this call.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Matched Suggestion List */}
          {currentCall.matches && currentCall.matches.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suggested Matches</span>
              <div className="grid gap-2">
                {currentCall.matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      {match.type === "companies" ? (
                        <Building2 className="h-5 w-5 text-slate-400" />
                      ) : (
                        <User className="h-5 w-5 text-slate-400" />
                      )}
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{match.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{match.type.slice(0, -1)} • Status: {match.status}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLink(match.id, match.type, match.name)}
                      disabled={isLinking}
                      size="sm"
                      className="bg-[#095c7b] hover:bg-[#074b64] text-white flex items-center gap-1.5 px-3 py-1.5"
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
          )}

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
                        size="xs"
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
            onClick={() => setCurrentCall(null)}
          >
            Decide Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
