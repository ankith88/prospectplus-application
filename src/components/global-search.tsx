
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getLeadsTool } from '@/ai/flows/get-leads-tool';
import type { Lead } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { Building, Search } from 'lucide-react';
import { Button } from './ui/button';

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

    if (debouncedQuery) {
        fetchResults();
    } else {
        setResults([]);
    }
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
  
  const runCommand = React.useCallback((command: () => unknown) => {
    setIsOpen(false)
    command()
  }, [])


  return (
    <>
    <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
    </Button>
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput 
          placeholder="Search leads, contacts, phone..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
            <CommandEmpty>{debouncedQuery.length > 1 ? 'No results found.' : 'Type to search...'}</CommandEmpty>
            {results.length > 0 && (
                <CommandGroup heading="Leads">
                    {results.map(lead => (
                        <CommandItem key={lead.id} onSelect={() => runCommand(() => router.push(`/leads/${lead.id}`))}>
                            <Building className="mr-2 h-4 w-4" />
                            <span>{lead.companyName}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>
            )}
        </CommandList>
    </CommandDialog>
    </>
  );
}
