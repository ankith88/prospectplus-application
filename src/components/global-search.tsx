
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { getLeadsTool } from '@/ai/flows/get-leads-tool';
import type { Lead } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Building, Phone, User } from 'lucide-react';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      
      const allLeads = await getLeadsTool({ summary: true });
      const lowercasedQuery = debouncedQuery.toLowerCase();
      
      const filteredLeads = allLeads.filter(lead => 
        lead.companyName.toLowerCase().includes(lowercasedQuery) ||
        (lead.customerPhone && lead.customerPhone.includes(lowercasedQuery)) ||
        (lead.contacts && lead.contacts.some(c => c.name.toLowerCase().includes(lowercasedQuery) || c.phone.includes(lowercasedQuery)))
      ).slice(0, 10); // Limit results

      setResults(filteredLeads);
    };

    fetchResults();
  }, [debouncedQuery]);
  
  const handleSelect = (leadId: string) => {
    router.push(`/leads/${leadId}`);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  return (
    <div className="relative w-full max-w-md">
      <Command shouldFilter={false} className="rounded-lg border shadow-md">
        <CommandInput 
          placeholder="Search leads, contacts, phone..."
          value={query}
          onValueChange={setQuery}
          onFocus={() => setIsOpen(true)}
        />
        {isOpen && (
            <CommandList>
                <CommandEmpty>{debouncedQuery.length > 1 ? 'No results found.' : 'Type to search...'}</CommandEmpty>
                {results.length > 0 && (
                    <CommandGroup heading="Leads">
                        {results.map(lead => (
                            <CommandItem key={lead.id} onSelect={() => handleSelect(lead.id)} value={lead.companyName}>
                                <Building className="mr-2 h-4 w-4" />
                                <span>{lead.companyName}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        )}
      </Command>
       {/* Close dropdown on outside click */}
       {isOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
