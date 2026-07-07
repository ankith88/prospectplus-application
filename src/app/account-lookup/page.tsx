'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Star, FileText, User, HelpCircle, ArrowRight } from 'lucide-react';
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

export default function AccountLookupPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ groups: Group[]; individuals: Site[] }>({
    groups: [],
    individuals: [],
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
      setResults({ groups: [], individuals: [] });
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    fetch(`/api/account-lookup?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setResults({
          groups: data.groups || [],
          individuals: data.individuals || [],
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

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const handleClear = () => {
    setQuery('');
    setResults({ groups: [], individuals: [] });
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase font-bold text-[#17414d] mb-1">
          Prospect+ · CRM Tools
        </p>
        <h1 className="font-serif text-3xl font-medium text-[#15251d] tracking-tight">
          Account Lookup — one box, every handle
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
            placeholder="Search by company name, Prospect+ ID, address, phone or email..."
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
        </div>

        {/* Results area */}
        <div className="min-h-[250px] p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#17414d] mb-3"></div>
              <p className="text-sm font-medium text-[#4a5a50]">Retrieving matches...</p>
            </div>
          )}

          {!loading && !query && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-10 w-10 text-[#4a5a50]/40 mb-3" />
              <p className="text-base font-semibold text-[#15251d]">One-Stop Account Lookup</p>
              <p className="text-sm text-[#4a5a50] max-w-sm mt-1">
                Enter a business name, email domain, phone number or ID in the bar above to query across all leads and signed companies.
              </p>
            </div>
          )}

          {!loading && query && results.groups.length === 0 && results.individuals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-base font-semibold text-[#15251d]">No matches found</p>
              <p className="text-sm text-[#4a5a50] max-w-sm mt-1">
                No matching leads or companies were found for "{query}". Try checking the spelling or querying by phone or email.
              </p>
            </div>
          )}

          {!loading && (results.groups.length > 0 || results.individuals.length > 0) && (
            <div className="space-y-6">
              <div className="text-xs font-bold uppercase tracking-widest text-[#4a5a50] mb-2">
                Results · {results.groups.length + results.individuals.length} match
                {results.groups.length + results.individuals.length !== 1 ? 'es' : ''}
              </div>

              {/* Render Group Matches */}
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

              {/* Render Individual (Ungrouped) Matches */}
              {results.individuals.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#4a5a50] px-1">
                    Individual Matches
                  </div>
                  {results.individuals.map((site) => (
                    <Link
                      key={site.id}
                      href={site.type === 'company' ? `/companies/${site.id}` : `/leads/${site.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#e3e8e0] hover:border-[#17414d]/30 hover:bg-[#f8faf6] transition-all bg-white group shadow-sm"
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
              )}
            </div>
          )}
      </div>
    </div>
  </div>
);
}
