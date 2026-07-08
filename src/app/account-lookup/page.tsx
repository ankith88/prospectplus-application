'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Star, FileText, User, HelpCircle, ArrowRight, Package, PlusCircle, History } from 'lucide-react';
import { useOnboarding } from '@/components/onboarding/onboarding-provider';

interface Site {
  id: string;
  type: 'lead' | 'company';
  companyName: string;
  prospectPlusId: string | null;
  entityId: string | null;
  status: string;
  customerStatus: string;
  franchisee: string;
  accountManagerAssigned: string;
  address: {
    address1?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  lastInvoiceDate: string | null;
  lastInvoiceNumber: string | null;
}

interface Group {
  id: string;
  name: string;
  type: 'group';
  meta: {
    total: number;
    serviced: number;
    toWin: number;
  };
  sites: Site[];
}

interface Ticket {
  id: string;
  ticketNumber: string;
  enquiryType: string;
  status: string;
  priority: string;
  companyName: string;
  createdAt: string | null;
}

export default function AccountLookupPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingPackage, setSearchingPackage] = useState(false);
  const [packageResult, setPackageResult] = useState<any>(null);
  const [showScans, setShowScans] = useState(false);
  const [results, setResults] = useState<{ groups: Group[]; individuals: Site[]; tickets: Ticket[] }>({
    groups: [],
    individuals: [],
    tickets: [],
  });

  // Debounce input value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults({ groups: [], individuals: [], tickets: [] });
      setPackageResult(null);
      return;
    }

    setLoading(true);
    setSearchingPackage(true);
    const controller = new AbortController();

    // 1. Fetch Accounts & Tickets
    fetch(`/api/account-lookup?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResults({
          groups: data.groups || [],
          individuals: data.individuals || [],
          tickets: data.tickets || [],
        });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Account lookup failed:', err);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Fetch Package
    fetch(`/api/packages/lookup?id=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        setPackageResult(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Package lookup failed:', err);
        }
      })
      .finally(() => {
        setSearchingPackage(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const handleClear = () => {
    setQuery('');
    setResults({ groups: [], individuals: [], tickets: [] });
    setPackageResult(null);
    setShowScans(false);
  };

  const getStatusColorClass = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('won') || s.includes('active') || s.includes('customer') || s.includes('signed') || s.includes('trial') || s.includes('serviced')) {
      return 'bg-[#e4f2e6] text-[#2f7d4f] border border-[#2f7d4f]/10';
    }
    return 'bg-[#fff] text-[#9a6b12] border border-[#e6d4a6]';
  };

  const formatAddress = (address: Site['address']) => {
    if (!address) return 'No address saved';
    const addr1 = address.address1 && address.address1 !== 'undefined' ? address.address1.trim() : '';
    const parts = [
      addr1,
      address.street,
      address.city,
      address.state,
      address.zip
    ].filter(Boolean);
    return parts.join(', ');
  };

  const hasResults = results.groups.length > 0 || results.individuals.length > 0 || results.tickets.length > 0 || packageResult !== null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase font-bold text-[#17414d] mb-1">
          Prospect+ · CRM Tools
        </p>
        <h1 className="font-serif text-3xl font-medium text-[#15251d] tracking-tight">
          Universal Lookup — one box, every handle
        </h1>
        <p className="text-sm text-[#4a5a50] mt-1">
          Find who you're speaking to, whether we serve them, and who owns the relationship.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-[#e3e8e0] overflow-hidden transition-all duration-300">
        {/* Search Bar */}
        <div className="flex items-center gap-3 px-6 py-5 border-bottom border-[#e3e8e0] bg-white">
          <Search className="h-5 w-5 text-[#17414d]" />
          <input
            type="text"
            className="flex-1 text-lg font-medium text-[#15251d] placeholder-[#4a5a50]/55 bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
            placeholder="Search by company name, Prospect+ ID, address, phone, email, package or ticket..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-gray-100 text-[#4a5a50] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Shortcuts / Quick reference */}
        <div className="flex flex-wrap gap-2 px-6 py-3 bg-[#f6f8f4] border-t border-b border-[#e3e8e0]">
          <span className="text-xs font-semibold text-[#4a5a50] self-center">Search by:</span>
          <button
            onClick={() => setQuery('Storage King')}
            className="text-xs bg-white border border-[#e3e8e0] hover:border-[#17414d] rounded-full px-3 py-1 font-semibold text-[#4a5a50] transition-all"
          >
            <b className="text-[#17414d]">Company</b> name
          </button>
          <span className="text-xs bg-white border border-[#e3e8e0] rounded-full px-3 py-1 font-semibold text-[#4a5a50] cursor-default">
            <b className="text-[#17414d]">Prospect+ ID</b>
          </span>
          <span className="text-xs bg-white border border-[#e3e8e0] rounded-full px-3 py-1 font-semibold text-[#4a5a50] cursor-default">
            <b className="text-[#17414d]">Address</b>
          </span>
          <span className="text-xs bg-white border border-[#e3e8e0] rounded-full px-3 py-1 font-semibold text-[#4a5a50] cursor-default">
            <b className="text-[#17414d]">Email</b>
          </span>
          <span className="text-xs bg-white border border-[#e3e8e0] rounded-full px-3 py-1 font-semibold text-[#4a5a50] cursor-default">
            <b className="text-[#17414d]">Phone</b>
          </span>
          <span className="text-xs bg-white border border-[#e3e8e0] rounded-full px-3 py-1 font-semibold text-[#4a5a50] cursor-default">
            <b className="text-[#17414d]">Package</b> Code / Order #
          </span>
          <span className="text-xs bg-white border border-[#e3e8e0] rounded-full px-3 py-1 font-semibold text-[#4a5a50] cursor-default">
            <b className="text-[#17414d]">Ticket ID</b> / Number
          </span>
        </div>

        {/* Results area */}
        <div className="min-h-[250px] p-6">
          {loading && (
            <div className="space-y-6 animate-pulse">
              <div className="h-4 bg-[#e3e8e0] rounded-full w-24 mb-4"></div>
              {/* Skeleton for Group */}
              <div className="border border-[#e3e8e0] rounded-xl p-4 bg-white space-y-4">
                <div className="flex justify-between items-center bg-[#f6f8f4] p-3 rounded-lg">
                  <div className="space-y-2 w-1/3">
                    <div className="h-4 bg-[#e3e8e0] rounded-full w-full"></div>
                    <div className="h-3 bg-[#e3e8e0] rounded-full w-2/3"></div>
                  </div>
                  <div className="h-5 bg-[#e3e8e0] rounded-full w-12"></div>
                </div>
                <div className="pl-4 space-y-3">
                  <div className="flex justify-between items-center p-2">
                    <div className="flex items-center gap-3 w-1/2">
                      <div className="h-3 w-3 bg-[#e3e8e0] rounded-full"></div>
                      <div className="space-y-2 w-full">
                        <div className="h-4 bg-[#e3e8e0] rounded-full w-3/4"></div>
                        <div className="h-3 bg-[#e3e8e0] rounded-full w-1/2"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-[#e3e8e0] rounded-full w-16"></div>
                  </div>
                </div>
              </div>
              
              {/* Skeleton for Individual Card */}
              <div className="border border-[#e3e8e0] rounded-xl p-4 bg-white space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 w-1/2">
                    <div className="h-3 w-3 bg-[#e3e8e0] rounded-full"></div>
                    <div className="space-y-2 w-full">
                      <div className="h-4 bg-[#e3e8e0] rounded-full w-2/3"></div>
                      <div className="h-3 bg-[#e3e8e0] rounded-full w-1/3"></div>
                    </div>
                  </div>
                  <div className="h-5 bg-[#e3e8e0] rounded-full w-20"></div>
                </div>
              </div>
            </div>
          )}

          {!loading && !query && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-[#4a5a50]/40 mb-3" />
              <p className="text-base font-semibold text-[#15251d]">One-Stop Account Lookup</p>
              <p className="text-sm text-[#4a5a50] max-w-sm mt-1">
                Enter a business name, email domain, phone number, package code or order number in the bar above to query across all modules.
              </p>
            </div>
          )}

          {/* Render Package Match Details */}
          {!loading && packageResult && (
            <div className="mb-8 border border-[#e3e8e0] rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#f3f7f1] border-b border-[#e3e8e0] gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#17414d] text-white rounded-lg">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[#15251d] flex items-center gap-2">
                      Package Matched
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                        packageResult.trackingData?.currentStatus?.toLowerCase().includes('delivered')
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {packageResult.trackingData?.currentStatus || 'Unknown'}
                      </span>
                    </h3>
                    <p className="text-xs text-[#4a5a50] mt-0.5 font-mono">
                      Code: <b className="text-[#15251d]">{packageResult.packageInfo?.code}</b>
                      {packageResult.packageInfo?.orderNumber && packageResult.packageInfo.orderNumber !== 'N/A' && (
                        <> · Order #: <b className="text-[#15251d]">{packageResult.packageInfo.orderNumber}</b></>
                      )}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/admin/tickets/create?identifier=${encodeURIComponent(packageResult.packageInfo?.code)}`}
                  className="inline-flex items-center justify-center gap-2 bg-[#17414d] hover:bg-[#17414d]/90 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm self-start sm:self-center"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Ticket
                </Link>
              </div>

              <div className="p-5 space-y-6">
                {/* Specs & Tracking Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Specs */}
                  <div className="bg-[#fcfdfb] p-4 rounded-xl border border-[#e3e8e0] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#17414d] mb-1">Specifications</h4>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
                      <span className="text-[#4a5a50]">Service Type:</span>
                      <span className="font-semibold text-[#15251d]">{packageResult.packageInfo?.serviceType || 'N/A'}</span>
                      <span className="text-[#4a5a50]">Weight:</span>
                      <span className="font-semibold text-[#15251d]">{packageResult.packageInfo?.weight || 'N/A'}</span>
                      <span className="text-[#4a5a50]">Dimensions:</span>
                      <span className="font-semibold text-[#15251d]">{packageResult.packageInfo?.dimensions || 'N/A'}</span>
                      <span className="text-[#4a5a50]">Description:</span>
                      <span className="font-semibold text-[#15251d]">{packageResult.packageInfo?.description || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-[#fcfdfb] p-4 rounded-xl border border-[#e3e8e0] space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#17414d] mb-1">Transit Status</h4>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
                      <span className="text-[#4a5a50]">Last Scan:</span>
                      <span className="font-semibold text-[#15251d]">{packageResult.trackingData?.lastScan || 'N/A'}</span>
                      <span className="text-[#4a5a50]">Last Movement:</span>
                      <span className="font-semibold text-[#15251d]">{packageResult.trackingData?.lastMovement || 'N/A'}</span>
                      <span className="text-[#4a5a50]">Current Depot:</span>
                      <span className="font-semibold text-[#15251d]">{packageResult.trackingData?.currentDepot || 'N/A'}</span>
                      <span className="text-[#4a5a50]">ETA / POD:</span>
                      <span className="font-semibold text-[#15251d]">
                        {packageResult.trackingData?.currentStatus?.toLowerCase().includes('delivered')
                          ? `Delivered (${packageResult.trackingData?.lastMovement || 'N/A'})`
                          : (packageResult.trackingData?.eta || 'In Transit')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sender & Receiver Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sender */}
                  <div className="space-y-2 text-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#17414d]">Sender (Customer)</h4>
                    <div className="border border-[#e3e8e0] rounded-xl p-3 bg-white space-y-1">
                      {packageResult.customerDetails?.companyId ? (
                        <Link
                          href={`/companies/${packageResult.customerDetails.companyId}`}
                          className="font-semibold text-sm text-[#17414d] hover:underline flex items-center gap-1 inline-flex"
                        >
                          {packageResult.customerDetails?.company}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <div className="font-semibold text-sm text-[#15251d]">{packageResult.customerDetails?.company || 'Unknown Sender'}</div>
                      )}
                      <div className="text-[#4a5a50]">Account #: {packageResult.customerDetails?.accountNumber || 'N/A'}</div>
                      <div className="text-[#4a5a50]">Franchisee: {packageResult.franchisee || 'N/A'}</div>
                      {packageResult.customerDetails?.contactName && (
                        <div className="text-[#4a5a50] mt-1 pt-1 border-t border-gray-100">
                          Primary: {packageResult.customerDetails.contactName} · {packageResult.customerDetails.phone || 'No phone'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Receiver */}
                  <div className="space-y-2 text-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#17414d]">Receiver (Consignee)</h4>
                    <div className="border border-[#e3e8e0] rounded-xl p-3 bg-white space-y-1">
                      <div className="font-semibold text-sm text-[#15251d]">{packageResult.receiverFullDetails?.name || 'Unknown Receiver'}</div>
                      <div className="text-[#4a5a50]">{packageResult.receiverFullDetails?.address || 'No address saved'}</div>
                      {(packageResult.receiverFullDetails?.phone || packageResult.receiverFullDetails?.email) && (
                        <div className="text-[#4a5a50] mt-1 pt-1 border-t border-gray-100">
                          {packageResult.receiverFullDetails.phone} {packageResult.receiverFullDetails.email && `· ${packageResult.receiverFullDetails.email}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scan History Toggle */}
                {packageResult.enrichedScans && packageResult.enrichedScans.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowScans(!showScans)}
                      className="text-xs font-bold uppercase tracking-wider text-[#17414d] hover:text-[#17414d]/80 flex items-center gap-1.5"
                    >
                      <History className="h-4 w-4" />
                      {showScans ? 'Hide Scan History' : `Show Scan History (${packageResult.enrichedScans.length})`}
                    </button>

                    {showScans && (
                      <div className="mt-3 border border-[#e3e8e0] rounded-xl divide-y divide-[#e3e8e0] max-h-60 overflow-y-auto bg-[#fafbfa]">
                        {packageResult.enrichedScans.map((scan: any, idx: number) => (
                          <div key={idx} className="p-3 flex items-start justify-between text-xs gap-3">
                            <div className="space-y-1">
                              <div className="font-semibold text-[#15251d]">{scan.scan_type}</div>
                              <div className="text-gray-500">
                                Depot: <span className="text-[#15251d] font-medium">{scan.partnerLocationName || 'Unknown'}</span>
                                {scan.partnerLocationAddress && <span className="text-gray-400"> ({scan.partnerLocationAddress})</span>}
                              </div>
                              <div className="text-gray-400 font-mono text-[10px]">Operator: {scan.operatorName || 'Unassigned'}</div>
                            </div>
                            <div className="text-right text-gray-400 font-mono text-[10px] whitespace-nowrap">
                              {scan.formattedTime}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && query && !hasResults && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-base font-semibold text-[#15251d]">No matches found</p>
              <p className="text-sm text-[#4a5a50] max-w-sm mt-1">
                No matching accounts, tickets, or packages were found for "{query}". Try checking the spelling or querying by phone or email.
              </p>
            </div>
          )}

          {!loading && (results.groups.length > 0 || results.individuals.length > 0 || results.tickets.length > 0) && (
            <div className="space-y-6">
              {/* Render Ticket Matches */}
              {results.tickets && results.tickets.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4a5a50] px-1">
                    Tickets
                  </div>
                  {results.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/admin/tickets/${ticket.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#e3e8e0] hover:border-[#17414d]/30 hover:bg-[#f8faf6] transition-all bg-white group shadow-sm animate-fade-in"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-base text-[#17414d]">
                          🎫
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-[#15251d] group-hover:text-[#17414d] flex items-center gap-1.5 transition-colors">
                            {ticket.ticketNumber} · {ticket.enquiryType}
                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-xs text-[#4a5a50] mt-0.5">
                            Company: <span className="font-semibold text-[#15251d]">{ticket.companyName}</span>
                            {ticket.createdAt && (
                              <> · Opened: <span className="font-mono text-gray-500">{new Date(ticket.createdAt).toLocaleString()}</span></>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 sm:mt-0 flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                          ticket.priority.toLowerCase() === 'high' || ticket.priority.toLowerCase() === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.priority}
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                          ticket.status.toLowerCase() === 'closed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Render Group Matches */}
              {results.groups.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4a5a50] px-1">
                    Group Matches
                  </div>
                  {results.groups.map((group) => (
                    <div key={group.id} className="border border-[#e3e8e0] rounded-xl p-4 bg-white shadow-sm space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-[#f3f7f1]">
                        <div>
                          <div className="font-semibold text-[#15251d] text-lg">{group.name} <span className="text-sm font-normal text-gray-500 font-mono ml-2">(Parent ID: {group.id})</span></div>
                          <div className="text-xs text-[#4a5a50] mt-0.5">
                            Group · {group.meta.total} site{group.meta.total !== 1 ? 's' : ''} ·{' '}
                            {group.meta.serviced} serviced ·{' '}
                            <span className="text-[#9a6b12] font-semibold">{group.meta.toWin} to win</span>
                          </div>
                        </div>
                        <span className="text-[10px] tracking-wider font-bold bg-[#17414d] text-white px-2.5 py-1 rounded-full uppercase">
                          Group
                        </span>
                      </div>

                      <div className="pl-4 space-y-3">
                        {group.sites.map((site) => (
                          <Link
                            key={site.id}
                            href={site.type === 'company' ? `/companies/${site.id}` : `/leads/${site.id}`}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-transparent hover:border-[#e3e8e0] hover:bg-[#f8faf6] transition-all group"
                          >
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 text-base ${site.type === 'company' || site.customerStatus === 'Won' ? 'text-[#d3e24a]' : 'text-gray-300'}`}>
                                ★
                              </span>
                              <div>
                                <div className="font-semibold text-sm text-[#15251d] group-hover:text-[#17414d] flex items-center gap-1.5 transition-colors">
                                  {site.companyName}
                                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-xs text-[#4a5a50] mt-0.5 font-mono">
                                  {site.entityId ? `NetSuite ${site.entityId}` : 'No NetSuite ID'}
                                  {site.prospectPlusId && (
                                    <>
                                      {' '}· <span className="text-[#17414d] font-semibold">{site.prospectPlusId}</span>
                                    </>
                                  )}
                                  {' '}· <span className="text-xs font-sans text-gray-500">{formatAddress(site.address)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 sm:mt-0 text-left sm:text-right">
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getStatusColorClass(site.customerStatus)}`}>
                                {site.customerStatus}
                              </span>
                              <div className="text-[11px] text-[#4a5a50] mt-1">
                                Franchisee <b className="text-[#15251d] font-semibold">{site.franchisee}</b> · AM <b className="text-[#15251d] font-semibold">{site.accountManagerAssigned}</b>
                              </div>
                              {site.lastInvoiceNumber && (
                                <div className="text-[10px] text-gray-500 mt-0.5">
                                  Last invoice {site.lastInvoiceNumber} · {site.lastInvoiceDate}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Render Individual (Ungrouped) Matches - Grouped by type */}
              {results.individuals.filter((s) => s.type === 'company').length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4a5a50] px-1">
                    Signed Customers
                  </div>
                  {results.individuals
                    .filter((s) => s.type === 'company')
                    .map((site) => (
                      <Link
                        key={site.id}
                        href={`/companies/${site.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#e3e8e0] hover:border-[#17414d]/30 hover:bg-[#f8faf6] transition-all bg-white group shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-base text-[#d3e24a]">
                            ★
                          </span>
                          <div>
                            <div className="font-semibold text-sm text-[#15251d] group-hover:text-[#17414d] flex items-center gap-1.5 transition-colors">
                              {site.companyName}
                              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-[#4a5a50] mt-0.5 font-mono">
                              {site.entityId ? `NetSuite ${site.entityId}` : 'No NetSuite ID'}
                              {site.prospectPlusId && (
                                <>
                                  {' '}· <span className="text-[#17414d] font-semibold">{site.prospectPlusId}</span>
                                </>
                              )}
                              {' '}· <span className="text-xs font-sans text-gray-500">{formatAddress(site.address)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 sm:mt-0 text-left sm:text-right">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getStatusColorClass(site.customerStatus)}`}>
                            {site.customerStatus}
                          </span>
                          <div className="text-[11px] text-[#4a5a50] mt-1">
                            Franchisee <b className="text-[#15251d] font-semibold">{site.franchisee}</b> · AM <b className="text-[#15251d] font-semibold">{site.accountManagerAssigned}</b>
                          </div>
                          {site.lastInvoiceNumber && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Last invoice {site.lastInvoiceNumber} · {site.lastInvoiceDate}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                </div>
              )}

              {results.individuals.filter((s) => s.type === 'lead').length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4a5a50] px-1">
                    Leads
                  </div>
                  {results.individuals
                    .filter((s) => s.type === 'lead')
                    .map((site) => (
                      <Link
                        key={site.id}
                        href={`/leads/${site.id}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#e3e8e0] hover:border-[#17414d]/30 hover:bg-[#f8faf6] transition-all bg-white group shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 text-base ${site.customerStatus === 'Won' ? 'text-[#d3e24a]' : 'text-gray-300'}`}>
                            ★
                          </span>
                          <div>
                            <div className="font-semibold text-sm text-[#15251d] group-hover:text-[#17414d] flex items-center gap-1.5 transition-colors">
                              {site.companyName}
                              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-[#4a5a50] mt-0.5 font-mono">
                              {site.entityId ? `NetSuite ${site.entityId}` : 'No NetSuite ID'}
                              {site.prospectPlusId && (
                                <>
                                  {' '}· <span className="text-[#17414d] font-semibold">{site.prospectPlusId}</span>
                                </>
                              )}
                              {' '}· <span className="text-xs font-sans text-gray-500">{formatAddress(site.address)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 sm:mt-0 text-left sm:text-right">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getStatusColorClass(site.customerStatus)}`}>
                            {site.customerStatus}
                          </span>
                          <div className="text-[11px] text-[#4a5a50] mt-1">
                            Franchisee <b className="text-[#15251d] font-semibold">{site.franchisee}</b> · AM <b className="text-[#15251d] font-semibold">{site.accountManagerAssigned}</b>
                          </div>
                          {site.lastInvoiceNumber && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Last invoice {site.lastInvoiceNumber} · {site.lastInvoiceDate}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
