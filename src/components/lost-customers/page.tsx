'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Lead, Address } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Building, Mail, MapPin, Phone, Search, XCircle, Trash2, Calendar, FileText, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCompaniesFromFirebase, getLeadsFromFirebase } from '@/services/firebase';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formatAddress = (address?: Address) => {
  if (!address) return 'N/A';
  return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
};

type SortKey = 'entityId' | 'companyName' | 'franchisee' | 'cancellationdate';

export default function LostCustomersComponent() {
  const [lostCustomers, setLostCustomers] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    companyName: '',
    franchisee: '',
    reason: '',
  });
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { canView, loadingPermissions } = usePermissions();
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companies, leads] = await Promise.all([
        getCompaniesFromFirebase({
          skipCoordinateCheck: true,
          franchisee: userProfile?.activeRole === 'Franchisee' ? userProfile.franchisee : undefined,
        }),
        getLeadsFromFirebase({
          summary: true,
          franchisee: userProfile?.activeRole === 'Franchisee' ? userProfile.franchisee : undefined,
        }),
      ]);

      // Filter for lost status
      const lostCompanies = companies.filter(
        (c) => c.status === 'Lost' || c.status === 'Lost Customer' || c.customerStatus === 'Lost' || c.customerStatus === 'Lost Customer'
      );
      const lostLeads = leads.filter(
        (l) => l.status === 'Lost' || l.status === 'Lost Customer' || l.customerStatus === 'Lost' || l.customerStatus === 'Lost Customer'
      );

      const combined = [
        ...lostCompanies.map((c) => ({ ...c, isCompany: true })),
        ...lostLeads.map((l) => ({ ...l, isCompany: false })),
      ];

      // Remove duplicate IDs just in case
      const seenIds = new Set<string>();
      const uniqueList = combined.filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });

      setLostCustomers(uniqueList);
    } catch (error) {
      console.error('Failed to fetch lost customers:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch lost customers.' });
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = canView('signedCustomers');

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading || loadingPermissions || !userProfile) return;

    if (hasAccess) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, authLoading, loadingPermissions, router, userProfile, hasAccess]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedList = useMemo(() => {
    let result = lostCustomers.filter((item) => {
      const companyMatch = filters.companyName
        ? item.companyName.toLowerCase().includes(filters.companyName.toLowerCase())
        : true;
      const franchiseeMatch = filters.franchisee
        ? (item.franchisee || '').toLowerCase().includes(filters.franchisee.toLowerCase())
        : true;
      const reasonMatch = filters.reason
        ? (item.cancellationReason || '').toLowerCase().includes(filters.reason.toLowerCase()) ||
          (item.cancellationTheme || '').toLowerCase().includes(filters.reason.toLowerCase())
        : true;

      return companyMatch && franchiseeMatch && reasonMatch;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        if (sortConfig.key === 'entityId') {
          valA = (a as any).entityId || '';
          valB = (b as any).entityId || '';
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [lostCustomers, filters, sortConfig]);

  if (loading || authLoading || loadingPermissions) {
    return (
      <div className="flex h-full items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#095c7b] flex items-center gap-2">
            <XCircle className="h-8 w-8 text-destructive" />
            Lost Customers
          </h1>
          <p className="text-muted-foreground">
            A comprehensive list of signed customers who have cancelled their services.
          </p>
        </div>
      </div>

      <Card className="border border-red-100 bg-red-50/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-[#095c7b]">
            <Filter className="h-5 w-5" /> Filters
          </CardTitle>
          <CardDescription>Refine the list of lost customers below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by company name..."
                  value={filters.companyName}
                  onChange={(e) => handleFilterChange('companyName', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Franchisee</label>
              <Input
                placeholder="Filter by franchisee..."
                value={filters.franchisee}
                onChange={(e) => handleFilterChange('franchisee', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cancellation Reason / Theme</label>
              <Input
                placeholder="Filter by reason or theme..."
                value={filters.reason}
                onChange={(e) => handleFilterChange('reason', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('entityId')} className="group -ml-4">
                    ID <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead className="max-w-xs">
                  <Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">
                    Company Name <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('franchisee')} className="group -ml-4">
                    Franchisee <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('cancellationdate')} className="group -ml-4">
                    Cancellation Date <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </Button>
                </TableHead>
                <TableHead>Theme & Category</TableHead>
                <TableHead>Cancelled By / On</TableHead>
                <TableHead className="max-w-md">Reason</TableHead>
                <TableHead className="hidden lg:table-cell">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedList.length > 0 ? (
                filteredAndSortedList.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/20">
                    <TableCell className="font-semibold text-xs">{(lead as any).entityId || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs font-medium">
                      <Button
                        variant="link"
                        className="p-0 h-auto text-left whitespace-normal flex items-start gap-2 text-[#095c7b] hover:underline"
                        onClick={() => window.open((lead as any).isCompany ? `/companies/${lead.id}` : `/leads/${lead.id}`, '_blank')}
                      >
                        <Building className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{lead.companyName}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm">{lead.franchisee || 'N/A'}</TableCell>
                    <TableCell className="text-sm">
                      {lead.cancellationdate ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-red-500" />
                          {new Date(lead.cancellationdate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {lead.cancellationTheme && (
                          <Badge variant="outline" className="w-fit text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            {lead.cancellationTheme}
                          </Badge>
                        )}
                        {lead.cancellationCategory && (
                          <span className="text-xs text-muted-foreground font-medium">
                            {lead.cancellationCategory}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-foreground">{(lead as any).serviceCancelledBy || 'N/A'}</span>
                        {(lead as any).serviceCancelledOnDate && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date((lead as any).serviceCancelledOnDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/75" />
                        <span className="line-clamp-2">{lead.cancellationReason || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      <div className="space-y-1">
                        {lead.customerServiceEmail && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{lead.customerServiceEmail}</span>
                          </div>
                        )}
                        {lead.customerPhone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{lead.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No lost customers found matching criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
