'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Building2, User, Ticket, Package, History, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface SearchResultItem {
  id: string;
  type: 'lead' | 'company' | 'ticket' | 'package';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  url: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<SearchResultItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('prospectplus_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const fetchSearch = async () => {
      try {
        let headers: HeadersInit = {};
        if (user) {
          const idToken = await user.getIdToken();
          headers['Authorization'] = `Bearer ${idToken}`;
          if (userProfile?.activeRole) {
            headers['X-Active-Role'] = userProfile.activeRole;
          }
        }

        const res = await fetch(`/api/account-lookup?q=${encodeURIComponent(trimmed)}&type=all`, {
          signal: controller.signal,
          headers,
        });

        if (!res.ok) throw new Error('Search failed');

        const data = await res.json();
        const items: SearchResultItem[] = [];

        const seenIds = new Set<string>();
        const companyIdsSet = new Set<string>();
        const combinedAccounts: any[] = [];

        // Extract sites from groups first
        (data.groups || []).forEach((group: any) => {
          (group.sites || []).forEach((site: any) => {
            const key = `${site.type}-${site.id}`;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              combinedAccounts.push({
                ...site,
                groupName: group.name,
              });
            }
          });
        });

        // Add individual accounts
        (data.individuals || []).forEach((item: any) => {
          const key = `${item.type}-${item.id}`;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            combinedAccounts.push(item);
          }
        });

        combinedAccounts.forEach((item: any) => {
          if (item.type === 'company') {
            if (item.id) companyIdsSet.add(String(item.id).toLowerCase());
            if (item.prospectPlusId) companyIdsSet.add(String(item.prospectPlusId).toLowerCase());
            if (item.entityId) companyIdsSet.add(String(item.entityId).toLowerCase());
          }
        });

        // Add Companies / Leads (omit duplicate leads if company exists with same ID)
        combinedAccounts
          .filter((item: any) => {
            if (item.type === 'lead') {
              const leadId = String(item.id || '').toLowerCase();
              const prospectPlusId = String(item.prospectPlusId || '').toLowerCase();
              const entityId = String(item.entityId || '').toLowerCase();
              if (
                (leadId && companyIdsSet.has(leadId)) ||
                (prospectPlusId && companyIdsSet.has(prospectPlusId)) ||
                (entityId && companyIdsSet.has(entityId))
              ) {
                return false;
              }
            }
            return true;
          })
          .slice(0, 10)
          .forEach((item: any) => {
            const isCompany = item.type === 'company';
            const groupTag = item.groupName ? ` · Group: ${item.groupName}` : '';
            items.push({
              id: `${item.type}-${item.id}`,
              type: item.type,
              title: item.companyName,
              subtitle: `${item.prospectPlusId ? `ID: ${item.prospectPlusId} · ` : ''}${item.franchisee || 'Unassigned'} · ${item.accountManagerAssigned || item.status}${groupTag}`,
              badge: isCompany ? 'Customer' : 'Lead',
              badgeColor: isCompany ? 'bg-[#e4f2e6] text-[#2f7d4f]' : 'bg-[#fef3c7] text-[#92400e]',
              url: isCompany ? `/companies/${item.id}` : `/leads/${item.id}`,
            });
          });

        // Add Tickets
        (data.tickets || []).slice(0, 4).forEach((ticket: any) => {
          items.push({
            id: `ticket-${ticket.id}`,
            type: 'ticket',
            title: `Ticket #${ticket.ticketNumber || ticket.id}: ${ticket.companyName}`,
            subtitle: `${ticket.enquiryType} · Priority: ${ticket.priority}`,
            badge: ticket.status || 'Ticket',
            badgeColor: 'bg-[#e0f2fe] text-[#0369a1]',
            url: `/app-tickets`,
          });
        });

        setResults(items);
        setSelectedIndex(0);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Command Palette search error:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSearch();

    return () => controller.abort();
  }, [debouncedQuery, user]);

  // Handle item selection & navigate
  const handleSelect = (item: SearchResultItem) => {
    // Save to recent searches
    const updated = [item, ...recentSearches.filter((r) => r.id !== item.id)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('prospectplus_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }

    setIsOpen(false);
    router.push(item.url);
  };

  // Keyboard navigation within list
  const activeList = results.length > 0 ? results : recentSearches;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeList.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % activeList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + activeList.length) % activeList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeList[selectedIndex]) {
        handleSelect(activeList[selectedIndex]);
      }
    }
  };

  const isPending = loading || (query.trim().length >= 2 && query.trim() !== debouncedQuery.trim());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-white gap-3">
          <Search className="h-5 w-5 text-[#095c7b] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-base text-slate-800 placeholder-slate-400 bg-transparent outline-none border-none focus:outline-none focus:ring-0"
            placeholder="Search company, ID, address, phone, ticket..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="hidden sm:inline-block text-xs font-medium text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50">
            ESC
          </span>
        </div>

        {/* Search Results / Recent List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {isPending && (
            <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#095c7b] border-t-transparent rounded-full animate-spin" />
              Searching accounts & tickets...
            </div>
          )}

          {!isPending && results.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Matching Accounts & Tickets
              </div>
              {results.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#f0f7f9] text-[#095c7b]' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.type === 'company' && <Building2 className="h-5 w-5 text-[#095c7b] shrink-0" />}
                      {item.type === 'lead' && <User className="h-5 w-5 text-amber-600 shrink-0" />}
                      {item.type === 'ticket' && <Ticket className="h-5 w-5 text-sky-600 shrink-0" />}
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                      {isSelected && <CornerDownLeft className="h-4 w-4 text-[#095c7b]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isPending && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching accounts or tickets found for <span className="font-semibold">"{query}"</span>.
            </div>
          )}

          {!isPending && query.trim().length < 2 && recentSearches.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Recent Searches
              </div>
              {recentSearches.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#f0f7f9] text-[#095c7b]' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">
                ↵
              </kbd>{' '}
              Select
            </span>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/account-lookup');
            }}
            className="text-[#095c7b] hover:underline font-medium flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" /> Full Universal Lookup
          </button>
        </div>
      </div>
    </div>
  );
}
