'use client'

import React, { useEffect, useState } from 'react'
import { firestore } from '@/lib/firebase'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, X, RefreshCw } from 'lucide-react'

interface SyncJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  completed: number;
}

export function SyncProgressWidget() {
  const [activeJob, setActiveJob] = useState<SyncJob | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)

  useEffect(() => {
    const q = query(
      collection(firestore, 'sync_jobs'),
      where('status', 'in', ['pending', 'processing']),
      limit(1)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        const data = doc.data()
        setActiveJob({
          id: doc.id,
          status: data.status,
          total: data.total || 0,
          completed: data.completed || 0,
        })
        setShowCompletion(false)
      } else {
        setActiveJob((prev) => {
          if (prev && (prev.status === 'processing' || prev.status === 'pending')) {
            setShowCompletion(true)
            setTimeout(() => setShowCompletion(false), 5000)
            return { ...prev, status: 'completed', completed: prev.total }
          }
          return null
        })
      }
    })

    return () => unsubscribe()
  }, [])

  if (!activeJob && !showCompletion) return null;

  const job = activeJob;
  if (!job) return null;

  const isCompleted = job.status === 'completed' || showCompletion;
  const progressPercent = job.total > 0 ? Math.round((job.completed / job.total) * 100) : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-indigo-100">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
              )}
              <h4 className="font-semibold text-sm text-slate-800">
                {isCompleted ? "Bulk Sync Completed" : "Syncing Barcodes..."}
              </h4>
            </div>
            {isCompleted && (
              <button onClick={() => setShowCompletion(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {!isCompleted && (
            <div className="space-y-2 mt-3">
              <Progress value={progressPercent} className="h-2" />
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>{job.completed} / {job.total} processed</span>
                <span>{progressPercent}%</span>
              </div>
            </div>
          )}
          
          {isCompleted && (
            <p className="text-xs text-slate-500 mt-1">
              Successfully synced {job.total} barcodes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
