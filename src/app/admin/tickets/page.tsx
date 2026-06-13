"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";

export default function TicketsListPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!userProfile) {
      router.push("/signin");
      return;
    }

    const canView = ['admin', 'superadmin', 'Customer Service'].includes(userProfile.activeRole || '');
    if (!canView) {
      router.push("/admin/dashboard");
      return;
    }

    const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(ticketsData);
      setLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [userProfile, loading, router]);

  if (loading || loadingTickets) return <FullScreenLoader message="Loading tickets..." />;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-[#095c7b]">Tickets</h2>
        <div className="flex items-center space-x-2">
          <Link href="/admin/tickets/create">
            <Button className="bg-[#eaf143] text-[#095c7b] hover:bg-[#d8e032] font-semibold">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Ticket
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No tickets found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-3">Identifier</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Enquirer</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="bg-background border-b hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        {ticket.trackingIdentifier}
                      </td>
                      <td className="px-6 py-4 truncate max-w-[200px]" title={ticket.issueCategory?.[0]}>
                        {ticket.issueCategory?.[0] || 'N/A'}
                        {ticket.issueCategory?.length > 1 && ` (+${ticket.issueCategory.length - 1})`}
                      </td>
                      <td className="px-6 py-4">
                        {ticket.enquirerName} <span className="text-xs text-muted-foreground">({ticket.enquirySource})</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{ticket.status || 'Open'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="link" size="sm" onClick={() => router.push(`/admin/tickets/${ticket.id}`)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
