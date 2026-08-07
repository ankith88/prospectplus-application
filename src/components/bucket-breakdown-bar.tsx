import React, { useMemo } from 'react';
import { FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function LeadBucketBadge({ bucket, className }: { bucket?: string | null; className?: string }) {
  const normalized = (bucket || 'outbound').toLowerCase().trim();
  let label = 'Outbound';
  let badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';

  switch (normalized) {
    case 'outbound':
      label = 'Outbound';
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
      break;
    case 'inbound':
      label = 'Inbound';
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      break;
    case 'field_sales':
    case 'fieldsales':
      label = 'Field Sales';
      badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
      break;
    case 'account_manager':
    case 'accountmanager':
      label = 'Account Management';
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
      break;
    case 'customer_success':
    case 'customersuccess':
      label = 'Customer Success';
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      break;
    case 'nurture':
      label = 'Nurture';
      badgeStyle = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
      break;
    case 'marketing':
      label = 'Marketing';
      badgeStyle = 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800';
      break;
    case 'lpo_plus':
    case 'lpoplus':
      label = 'LPO.Plus';
      badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800';
      break;
    case 'in_review':
      label = 'In Review';
      badgeStyle = 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800';
      break;
    case 'multisite':
      label = 'Multisite';
      badgeStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800';
      break;
    case 'blank':
    case 'unassigned':
    case '':
      label = 'Unassigned';
      badgeStyle = 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      break;
    default:
      label = normalized.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      badgeStyle = 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      break;
  }

  return (
    <Badge variant="outline" className={cn("font-medium text-xs", badgeStyle, className)}>
      {label}
    </Badge>
  );
}

interface BucketBreakdownBarProps<T = any> {
  items: T[];
  selectedBucket: string | null;
  onSelectBucket: (bucket: string | null) => void;
  getBucket?: (item: T) => string;
  className?: string;
  title?: string;
}

export function BucketBreakdownBar<T = any>({
  items,
  selectedBucket,
  onSelectBucket,
  getBucket = (item: any) => item.bucket || item.leadBucket || (item.fieldSales ? 'field_sales' : 'outbound'),
  className,
  title = "Bucket Breakdown",
}: BucketBreakdownBarProps<T>) {
  const bucketBreakdown = useMemo(() => {
    if (!items || items.length === 0) return [];
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const rawBucket = getBucket(item);
      const b = (typeof rawBucket === 'string' && rawBucket.trim()) ? rawBucket.trim() : 'outbound';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => b.count - a.count);
  }, [items, getBucket]);

  if (bucketBreakdown.length === 0) return null;

  return (
    <div className={cn("bg-slate-50/90 border border-slate-200 rounded-lg p-3 my-2 shrink-0 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FolderKanban className="h-3.5 w-3.5 text-[#095c7b]" />
          {title} ({items.length} Record{items.length === 1 ? '' : 's'})
        </span>
        {selectedBucket && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectBucket(null)}
            className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
          >
            Clear bucket filter
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {bucketBreakdown.map(({ bucket, count }) => {
          const isSelected = selectedBucket === bucket;
          const percentage = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
          return (
            <button
              key={bucket}
              type="button"
              onClick={() => onSelectBucket(isSelected ? null : bucket)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1 text-xs border transition-all cursor-pointer shadow-2xs",
                isSelected 
                  ? "bg-[#095c7b]/10 border-[#095c7b] ring-1 ring-[#095c7b]" 
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
              )}
              title={`Click to filter list by bucket: ${bucket}`}
            >
              <LeadBucketBadge bucket={bucket} />
              <span className="font-bold text-slate-800 text-xs">{count} lead{count === 1 ? '' : 's'}</span>
              <span className="text-[10px] text-slate-500 font-medium">({percentage}%)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
