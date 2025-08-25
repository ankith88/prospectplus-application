
'use client'

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from './ui/button';
import { Search, Briefcase, User, Phone, Mail, Hash } from 'lucide-react';
import { universalSearch } from '@/ai/flows/universal-search-flow';

export interface UniversalSearchInput {
  query: string;
}

export interface UniversalSearchOutput {
  leads: { id: string; companyName: string }[];
  contacts: { id: string; name: string; leadId: string; leadName: string }[];
  transcripts: { id: string; callId: string; leadId: string; leadName: string }[];
}


export function UniversalSearch() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UniversalSearchOutput>({ leads: [], contacts: [], transcripts: [] });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runSearch = useCallback(async () => {
    if (searchTerm.length < 3) {
      setResults({ leads: [], contacts: [], transcripts: [] });
      return;
    }
    setLoading(true);
    try {
      const searchResults = await universalSearch({ query: searchTerm });
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      // Optionally show a toast notification
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      runSearch();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, runSearch]);

  const handleSelect = (url: string) => {
    router.push(url);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search...
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search leads, contacts, calls..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          {loading && <CommandEmpty>Searching...</CommandEmpty>}
          {!loading && searchTerm.length >= 3 && results.leads.length === 0 && results.contacts.length === 0 && results.transcripts.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {results.leads.length > 0 && (
            <CommandGroup heading="Leads">
              {results.leads.map((lead) => (
                <CommandItem key={`lead-${lead.id}`} onSelect={() => handleSelect(`/leads/${lead.id}`)}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>{lead.companyName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.contacts.length > 0 && (
            <CommandGroup heading="Contacts">
              {results.contacts.map((contact) => (
                <CommandItem key={`contact-${contact.id}`} onSelect={() => handleSelect(`/leads/${contact.leadId}`)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>{contact.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{contact.leadName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
           {results.transcripts.length > 0 && (
            <CommandGroup heading="Calls">
              {results.transcripts.map((transcript) => (
                <CommandItem key={`transcript-${transcript.id}`} onSelect={() => handleSelect(`/leads/${transcript.leadId}`)}>
                  <Hash className="mr-2 h-4 w-4" />
                  <span>Call ID: {transcript.callId}</span>
                   <span className="ml-2 text-xs text-muted-foreground">{transcript.leadName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

        </CommandList>
      </CommandDialog>
    </>
  );
}
