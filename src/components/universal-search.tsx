

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
import { Search, Briefcase, Phone, Hash } from 'lucide-react'
import { getLeadsFromFirebase } from '@/services/firebase'
import type { Lead, Contact, Activity } from '@/lib/types'

type SearchResult = {
  type: 'lead' | 'call' | 'contact'
  id: string
  title: string
  description: string
  leadId: string
  icon: React.ReactNode
}

export function UniversalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [allLeads, setAllLeads] = useState<Lead[]>([])
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

  const fetchData = useCallback(async () => {
    if (allLeads.length > 0) return
    setLoading(true)
    try {
      const leads = await getLeadsFromFirebase({ summary: false }) // Fetch full data
      setAllLeads(leads)
    } catch (error) {
      console.error('Failed to fetch search data:', error)
    } finally {
      setLoading(false)
    }
  }, [allLeads])

  useEffect(() => {
    if (open && allLeads.length === 0) {
      fetchData()
    }
  }, [open, allLeads, fetchData])

  const performSearch = (searchQuery: string) => {
    if (!searchQuery) {
      setResults([])
      return
    }

    const lowerCaseQuery = searchQuery.toLowerCase()
    const searchResults: SearchResult[] = []

    allLeads.forEach((lead) => {
      // Search by lead name
      if (lead.companyName.toLowerCase().includes(lowerCaseQuery)) {
        searchResults.push({
          type: 'lead',
          id: lead.id,
          title: lead.companyName,
          description: `Lead • ${lead.industryCategory || 'N/A'}`,
          leadId: lead.id,
          icon: <Briefcase className="mr-2 h-4 w-4" />,
        })
      }

      // Search by contact phone number
      lead.contacts?.forEach((contact) => {
        if (contact.phone && contact.phone.replace(/\D/g, '').includes(lowerCaseQuery.replace(/\D/g, ''))) {
          searchResults.push({
            type: 'contact',
            id: contact.id,
            title: `${contact.name} (${contact.phone})`,
            description: `Contact at ${lead.companyName}`,
            leadId: lead.id,
            icon: <Phone className="mr-2 h-4 w-4" />,
          })
        }
      })
      
      // Search by lead phone number
      if (lead.customerPhone && lead.customerPhone.replace(/\D/g, '').includes(lowerCaseQuery.replace(/\D/g, ''))) {
          searchResults.push({
            type: 'lead',
            id: `${lead.id}-phone`,
            title: `${lead.companyName} (${lead.customerPhone})`,
            description: 'Lead Phone Number',
            leadId: lead.id,
            icon: <Phone className="mr-2 h-4 w-4" />,
          })
      }

      // Search by AirCall Call ID
      lead.activity?.forEach((activity) => {
        if (activity.type === 'Call' && activity.callId && activity.callId.includes(lowerCaseQuery)) {
          searchResults.push({
            type: 'call',
            id: activity.id,
            title: `Call ID: ${activity.callId}`,
            description: `Call with ${lead.companyName}`,
            leadId: lead.id,
            icon: <Hash className="mr-2 h-4 w-4" />,
          })
        }
      })
    })

    setResults(searchResults)
  }

  const handleSelect = (leadId: string) => {
    router.push(`/leads/${leadId}`)
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
        <Search className="h-5 w-5" />
        <span className="sr-only">Search</span>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search by lead name, phone, or call ID..."
          value={query}
          onValueChange={(value) => {
            setQuery(value)
            performSearch(value)
          }}
          disabled={loading}
        />
        <CommandList>
          {loading && <div className="p-4 text-sm text-center">Loading data...</div>}
          {!loading && <CommandEmpty>No results found.</CommandEmpty>}
          <CommandGroup heading="Results">
            {results.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                value={`${result.title} ${result.description}`}
                onSelect={() => handleSelect(result.leadId)}
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
