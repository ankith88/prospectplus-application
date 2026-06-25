"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { firestore as db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface AccessDeniedProps {
  customPageName?: string;
}

export function AccessDenied({ customPageName }: AccessDeniedProps) {
  const { user, userProfile } = useAuth();
  const pathname = usePathname();
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const pagePath = customPageName || pathname || "Unknown Page";

  const handleRequestAccess = async () => {
    if (!user || !userProfile) {
      toast.error("You must be logged in to request access.");
      return;
    }

    setRequesting(true);
    try {
      const ticketsRef = collection(db, "app_tickets");
      const requestTime = new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" });
      
      const payload = {
        title: `Access Request: ${pagePath}`,
        type: "issue",
        description: `Automatic Access Request:\n\nUser: ${userProfile.displayName}\nEmail: ${user.email || "No Email"}\nRole: ${userProfile.activeRole || "No Active Role"}\nRequested Page: ${pagePath}\nDate & Time: ${requestTime} (Sydney Time)`,
        status: "open",
        attachments: [],
        createdBy: userProfile.uid,
        createdByName: userProfile.displayName || "Unknown User",
        createdByEmail: user.email || "No Email",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminNotes: ""
      };

      await addDoc(ticketsRef, payload);
      
      toast.success("Access request ticket submitted successfully!");
      setRequested(true);
    } catch (error) {
      console.error("Error submitting access request ticket:", error);
      toast.error("Failed to submit request. Please contact administrator directly.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-6 max-w-md mx-auto animate-in fade-in duration-300">
      <div className="bg-rose-50 p-4 rounded-full border border-rose-100 shadow-sm">
        <ShieldAlert className="h-12 w-12 text-rose-600" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#095c7b]">Access Denied</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You do not have permission to view <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{pagePath}</code>.
        </p>
        <p className="text-xs text-muted-foreground">
          Please request access if this screen is required for your role.
        </p>
      </div>

      <div className="pt-2 w-full">
        {requested ? (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-3 flex items-center justify-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            Access Requested Successfully
          </div>
        ) : (
          <Button
            onClick={handleRequestAccess}
            disabled={requesting}
            className="w-full bg-[#095c7b] hover:bg-[#053647] text-white font-semibold shadow-md py-5 text-sm"
          >
            {requesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              "Request Access"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
