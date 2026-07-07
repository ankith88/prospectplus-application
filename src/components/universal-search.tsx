
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'

export function UniversalSearch() {
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        router.push('/account-lookup')
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [router])

  return (
    <Link
      href="/account-lookup"
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-55 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-sidebar-accent hover:text-sidebar-hover-foreground"
      title="Account Lookup"
    >
      <Search className="h-6 w-6" strokeWidth={3} />
      <span className="sr-only">Search</span>
    </Link>
  )
}

