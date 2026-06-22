"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { TicketForm } from "./components/ticket-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreateTicketPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!userProfile) {
      router.push("/signin");
      return;
    }

    if (!canView('tickets')) {
      router.push("/admin/dashboard");
      return;
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile) return <FullScreenLoader message="Verifying access..." />;

  // Setting the canvas background to match the branding requirement
  return (
    <div className="min-h-screen bg-[#d0dfcd] flex-1 flex flex-col p-4 md:p-8 font-['Inter']">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/admin/tickets">
            <Button variant="ghost" size="icon" className="hover:bg-black/5 text-[#095c7b]">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Create Ticket</h1>
            <p className="text-sm text-[#095c7b]/80">Log and manage transit issues and enquiries.</p>
          </div>
        </div>

        <TicketForm />
      </div>
    </div>
  );
}
