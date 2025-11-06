
'use client'

import { Bell, MessageSquare, Phone } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from './ui/button'
import { useEffect, useState } from 'react'
import type { Activity } from '@/lib/types'
import { useAuth } from '@/hooks/use-auth'
import { getSharedCallsForUser } from '@/services/firebase'
import { Badge } from './ui/badge'
import { Loader } from './ui/loader'
import { format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function SharedReviewBell() {
  const [calls, setCalls] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const { user, userProfile } = useAuth()

  useEffect(() => {
    const fetchSharedCalls = async () => {
      if (!userProfile?.displayName) return
      setLoading(true)
      try {
        const sharedWithMe = await getSharedCallsForUser(userProfile.displayName);
        setCalls(sharedWithMe)
      } catch (error) {
        console.error('Failed to fetch shared calls:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSharedCalls()

    const interval = setInterval(fetchSharedCalls, 5 * 60 * 1000) // every 5 minutes
    return () => clearInterval(interval)
  }, [userProfile])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {calls.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0"
            >
              {calls.length}
            </Badge>
          )}
          <span className="sr-only">Shared Call Reviews</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Shared For Coaching
            </h4>
            <p className="text-sm text-muted-foreground">
              You have {calls.length} call(s) shared with you for review.
            </p>
          </div>
          <div className="grid gap-2">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader />
              </div>
            ) : calls.length > 0 ? (
              calls.map((call) => (
                <div key={call.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-none">
                      <Link href="/calls" className="hover:underline">
                        {(call as any).leadName || 'Unknown Lead'}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Call from {call.review?.reviewer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Shared on: {format(new Date(call.review!.date), 'PP')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground p-4">
                No calls have been shared with you.
              </p>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href="/calls">View All Shared Calls</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
