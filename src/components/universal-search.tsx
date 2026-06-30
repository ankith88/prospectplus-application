

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
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
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

  // Debounce query string
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => {
      clearTimeout(handler)
    }
  }, [query])

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const controller = new AbortController()

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        const searchResults: SearchResult[] = (data.results || []).map((item: any) => ({
          type: item.type,
          id: item.id,
          title: item.title,
          description: item.description,
          icon: item.type === 'lead' ? (
            <Briefcase className="mr-2 h-4 w-4" />
          ) : (
            <Star className="mr-2 h-4 w-4" />
          )
        }))
        setResults(searchResults)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Search request failed:', err)
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [debouncedQuery])

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
