
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Activity, Lead } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { firestore } from '@/lib/firebase'
import { collection, getDocs, orderBy, query, doc, deleteDoc, writeBatch } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Clock, FileText, DownloadCloud, Link as LinkIcon, AlertCircle, Hash, X } from 'lucide-react'
import { getUserCallTranscripts } from '@/ai/flows/get-user-call-transcripts-flow'
import { useToast } from '@/hooks/use-toast'
import { logActivity } from '@/services/firebase'
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format } from 'date-fns'

type UnmatchedActivity = Activity & {
    phoneNumber: string;
};

export default function UnmatchedActivitiesPage() {
  const router = useRouter();

   useEffect(() => {
    // This page is deprecated, redirect to the new transcripts page
    router.replace('/transcripts');
  }, [router]);


  return (
    <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <p>This page has been moved. Redirecting to All Transcripts...</p>
            <Loader />
        </div>
    </div>
  )
}
