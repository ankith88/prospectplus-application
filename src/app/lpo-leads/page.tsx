"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, ArrowUpRight } from 'lucide-react';

interface LpoLead {
  id: string;
  prospectPlusId: string;
  lpoName: string;
  lpoOwnerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  postcode: string;
  status: string;
  createdAt?: any;
}

export default function LpoLeadsListPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const [leads, setLeads] = useState<LpoLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    if (authLoading || loadingPermissions || !canView('lpoLeads')) return;

    const q = query(collection(firestore, 'lpo_leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData: LpoLead[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        leadsData.push({
          id: doc.id,
          ...data,
        } as LpoLead);
      });
      setLeads(leadsData);
      setLoadingLeads(false);
    }, (error) => {
      console.error('Error fetching LPO leads:', error);
      setLoadingLeads(false);
    });

    return () => unsubscribe();
  }, [authLoading, loadingPermissions, canView]);

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Loading..." />;
  }

  if (!canView('lpoLeads')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the LPO Leads page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-[#095c7b]" />
            LPO Leads
          </h1>
          <p className="text-slate-500 mt-1">Manage and track Licensed Post Office franchise leads.</p>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">Enquiries List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLeads ? (
            <div className="p-8 text-center text-slate-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No LPO leads found.</div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/40">
                <TableRow>
                  <TableHead className="font-semibold w-[120px]">Lead ID</TableHead>
                  <TableHead className="font-semibold">LPO Location/Name</TableHead>
                  <TableHead className="font-semibold">Owner Name</TableHead>
                  <TableHead className="font-semibold">Contact Email</TableHead>
                  <TableHead className="font-semibold">Contact Phone</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold w-[100px]">Status</TableHead>
                  <TableHead className="font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium text-[#095c7b]">
                      {lead.prospectPlusId}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{lead.lpoName}</TableCell>
                    <TableCell className="text-slate-600">{lead.lpoOwnerName}</TableCell>
                    <TableCell className="text-slate-600">{lead.email}</TableCell>
                    <TableCell className="text-slate-600">{lead.phone}</TableCell>
                    <TableCell className="text-slate-600">
                      {lead.city && lead.state ? `${lead.city}, ${lead.state}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={
                          lead.status === 'New' 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                            : lead.status === 'Lost'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200'
                        }
                      >
                        {lead.status || 'New'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link 
                        href={`/lpo-leads/${lead.id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#095c7b] hover:text-[#053647]"
                      >
                        Profile
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
