"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { FullScreenLoader } from '@/components/ui/loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, ArrowUpRight, Search, MapPin, Briefcase } from 'lucide-react';
import { Lead } from '@/lib/types';

export default function LpoOpportunitiesPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const [opportunities, setOpportunities] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (authLoading || loadingPermissions || !canView('lpoLeads')) return;

    // Query both leads and companies collections for lpoPlusOpportunity === true
    const qLeads = query(collection(firestore, 'leads'), where('lpoPlusOpportunity', '==', true));
    const qCompanies = query(collection(firestore, 'companies'), where('lpoPlusOpportunity', '==', true));

    let leadsData: Lead[] = [];
    let companiesData: Lead[] = [];

    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      leadsData = [];
      snapshot.forEach((doc) => {
        leadsData.push({ id: doc.id, ...doc.data() } as Lead);
      });
      combineAndSet();
    }, (err) => {
      console.error("Error fetching leads opportunities:", err);
      setLoading(false);
    });

    const unsubCompanies = onSnapshot(qCompanies, (snapshot) => {
      companiesData = [];
      snapshot.forEach((doc) => {
        companiesData.push({ id: doc.id, ...doc.data(), isFromCompaniesCollection: true } as Lead);
      });
      combineAndSet();
    }, (err) => {
      console.error("Error fetching companies opportunities:", err);
      setLoading(false);
    });

    function combineAndSet() {
      // Avoid duplicate IDs just in case, and sort by company name
      const combined = [...leadsData, ...companiesData];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      unique.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
      setOpportunities(unique);
      setLoading(false);
    }

    return () => {
      unsubLeads();
      unsubCompanies();
    };
  }, [authLoading, loadingPermissions, canView]);

  if (authLoading || loadingPermissions) {
    return <FullScreenLoader message="Loading opportunities..." />;
  }

  if (!canView('lpoLeads')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view the LPO Opportunities page.</p>
      </div>
    );
  }

  const filteredOpportunities = opportunities.filter((op) => {
    const q = searchQuery.toLowerCase();
    return (
      op.companyName?.toLowerCase().includes(q) ||
      op.status?.toLowerCase().includes(q) ||
      op.state?.toLowerCase().includes(q) ||
      op.address?.city?.toLowerCase().includes(q) ||
      op.dialerAssigned?.toLowerCase().includes(q) ||
      op.accountManagerAssigned?.toLowerCase().includes(q) ||
      op.salesRepAssigned?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-[#095c7b]" />
            Shared Opportunities
          </h1>
          <p className="text-slate-500 mt-1">Leads pushed to the LPO.Plus project for allocation and service delivery.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-200/85 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Pushed Leads</CardDescription>
            <CardTitle className="text-3xl font-bold text-[#095c7b]">{opportunities.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search opportunities by name, status, rep, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">Opportunities List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading opportunities...</div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No opportunities found matching search.</div>
          ) : (
            <Table>
              <TableHeader className="bg-[#095c7b] hover:bg-[#095c7b]">
                <TableRow className="hover:bg-[#095c7b]">
                  <TableHead className="font-bold text-white">Company Name</TableHead>
                  <TableHead className="font-bold text-white">Status</TableHead>
                  <TableHead className="font-bold text-white">Location</TableHead>
                  <TableHead className="font-bold text-white">Assigned Representative</TableHead>
                  <TableHead className="font-bold text-white text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((op) => {
                  const locationStr = [op.address?.city, op.address?.state].filter(Boolean).join(', ') || 'No location';
                  const assignedRep = op.accountManagerAssigned || op.salesRepAssigned || op.dialerAssigned || 'Unassigned';

                  return (
                    <TableRow key={op.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-semibold text-slate-800 py-3.5">
                        {op.companyName}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="bg-[#095c7b]/5 text-[#095c7b] border-[#095c7b]/20">
                          {op.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-slate-600">
                        <span className="flex items-center gap-1.5 text-sm">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                          {locationStr}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-slate-600 font-medium">
                        <span className="flex items-center gap-1.5 text-sm">
                          <Briefcase className="h-4 w-4 text-slate-400 shrink-0" />
                          {assignedRep}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <Link href={op.isFromCompaniesCollection ? `/companies/${op.id}` : `/leads/${op.id}`} target="_blank">
                          <Button size="sm" variant="ghost" className="text-[#095c7b] hover:text-[#053647] font-bold">
                            View Profile
                            <ArrowUpRight className="h-4 w-4 ml-1.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
