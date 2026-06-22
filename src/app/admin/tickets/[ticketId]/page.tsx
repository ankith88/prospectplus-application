"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter, useParams } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";

export default function TicketDetailsPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.ticketId as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loadingTicket, setLoadingTicket] = useState(true);

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

    const fetchTicket = async () => {
      try {
        const docRef = doc(db, "tickets", ticketId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTicket(docSnap.data());
        } else {
          // ticket not found
        }
      } catch (error) {
        console.error("Error fetching ticket:", error);
      } finally {
        setLoadingTicket(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    }
  }, [userProfile, loading, router, ticketId]);

  if (loading || loadingTicket) return <FullScreenLoader message="Loading ticket details..." />;

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#095c7b] mb-4">Ticket Not Found</h2>
          <Button onClick={() => router.push("/admin/tickets")}>Back to Tickets</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/admin/tickets">
          <Button variant="ghost" size="icon" className="hover:bg-black/5 text-[#095c7b]">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b]">Ticket Details</h1>
          <p className="text-sm text-[#095c7b]/80">Ticket ID: {ticketId}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Package Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Tracking Identifier:</strong> {ticket.trackingIdentifier}</p>
            <p><strong>Status:</strong> {ticket.status}</p>
            <p><strong>Customer Name:</strong> {ticket.customerName || 'N/A'}</p>
            <p><strong>Franchisee:</strong> {ticket.franchisee || 'N/A'}</p>
            <p><strong>Operator Details:</strong> {ticket.operatorDetails || 'N/A'}</p>
            <p><strong>Scan Details:</strong> {ticket.scanDetails || 'N/A'}</p>
            <p><strong>Sender:</strong> {ticket.senderDetails?.name || 'N/A'}</p>
            <p><strong>Receiver:</strong> {ticket.receiverDetails?.name || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enquirer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Source:</strong> {ticket.enquirySource}</p>
            <p><strong>Name:</strong> {ticket.enquirerName}</p>
            {ticket.enquirySource === 'Phone' ? (
              <p><strong>Phone:</strong> {ticket.enquirerPhone}</p>
            ) : (
              <p><strong>Email:</strong> {ticket.enquirerEmail}</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Issues & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Selected Categories:</h3>
              <ul className="list-disc pl-5">
                {ticket.issueCategory?.map((cat: string, i: number) => (
                  <li key={i}>{cat}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Notes:</h3>
              <p className="whitespace-pre-wrap bg-muted p-4 rounded-md">{ticket.notes}</p>
            </div>
          </CardContent>
        </Card>

        {ticket.attachments?.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {ticket.attachments.map((file: any, i: number) => (
                  <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-2 border p-2 rounded-md">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
