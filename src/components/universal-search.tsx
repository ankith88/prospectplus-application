

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from './ui/button'
import { Search, Briefcase, Star } from 'lucide-react'
import { getLeadsFromFirebase, getCompaniesFromFirebase } from '@/services/firebase'
import type { Lead } from '@/lib/types'

// Updated SearchResult type
type SearchResult = {
  type: 'lead' | 'company'
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

export function UniversalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchData, setSearchData] = useState<(Lead & { resultType: 'lead' | 'company' })[]>([]) // Combined data source
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open && searchData.length === 0) {
      setLoading(true)
      Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getCompaniesFromFirebase(),
      ])
        .then(([leads, companies]) => {
          const combinedData = [
            ...leads.map(lead => ({ ...lead, resultType: 'lead' as const })),
            ...companies.map(company => ({ ...company, resultType: 'company' as const })),
          ];
          setSearchData(combinedData)
        })
        .catch((error) => {
          console.error('Failed to fetch search data:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, searchData.length])

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }

    if (searchData.length > 0) {
      const lowerCaseQuery = query.toLowerCase()
      const searchResults: SearchResult[] = searchData
        .filter(item => item.companyName.toLowerCase().includes(lowerCaseQuery))
        .map(item => {
          if (item.resultType === 'lead') {
            return {
              type: 'lead',
              id: item.id,
              title: item.companyName,
              description: `Lead • ${item.status}`,
              icon: <Briefcase className="mr-2 h-4 w-4" />,
            }
          } else { // company
            return {
              type: 'company',
              id: item.id,
              title: item.companyName,
              description: 'Signed Customer',
              icon: <Star className="mr-2 h-4 w-4" />,
            }
          }
        });
      setResults(searchResults)
    }
  }, [query, searchData])


  const handleSelect = (result: SearchResult) => {
    if (result.type === 'lead') {
      router.push(`/leads/${result.id}`)
    } else if (result.type === 'company') {
      router.push(`/companies/${result.id}`)
    }
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="text-sidebar-accent hover:text-sidebar-hover-foreground"
      >
        <Search className="h-6 w-6" strokeWidth={3} />
        <span className="sr-only">Search</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search by company name..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && <div className="p-4 text-sm text-center">Loading data...</div>}
          {!loading && query && results.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
          {!loading && !query && <CommandEmpty>Type to search...</CommandEmpty>}
          <CommandGroup heading="Results">
            {results.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                value={`${result.title} ${result.description}`}
                onSelect={() => handleSelect(result)}
              >
                {result.icon}
                <div>
                  <p>{result.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {result.description}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
