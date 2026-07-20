import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface ScanRecord {
  scan_type: string;
  courier: string;
  updated_at: string;
  customer_ns_id?: string;
  delivery_speed?: string;
}

interface PackageRecord {
  code: string;
  order_number: string;
  sync_date: string;
  scans: ScanRecord[];
  latest_scan_at?: string;
}

interface CompanyMapEntry {
  id: string;
  name: string;
  franchisee: string;
  type: 'companies' | 'leads';
}

interface CustomerStats {
  id: string;
  companyId?: string;
  type?: 'companies' | 'leads';
  name: string;
  franchisee: string;
  allTimeBarcodes: number;
  currentWeekScans: number;
  currentMonthScans: number;
  weeklyAverage: number;
  monthlyAverage: number;
  deliverySpeeds: Record<string, number>;
  lastScanDate: string | null;
  lastContact?: {
    date: string | null;
    type: string | null;
    author: string | null;
    notes: string | null;
  } | null;
}

// In-memory cache variables
let cache: {
  packages: PackageRecord[];
  timestamp: number;
} | null = null;

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const parseDateString = (dateStr: string) => {
  if (!dateStr) return new Date(NaN);
  if (typeof dateStr !== 'string') return new Date(dateStr);
  
  if (dateStr.match(/^\d{2}-\d{2}-\d{4}/)) {
    const [dd, mm, yyyy] = dateStr.split('T')[0].split(' ')[0].split('-');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  }
  
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
    const [dd, mm, yyyy] = dateStr.split(' ')[0].split('/');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  }

  return new Date(dateStr);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const rangeParam = searchParams.get('range');
  const refreshParam = searchParams.get('refresh') === 'true';
  const validRanges = ['today', 'yesterday', 'this_week', 'last_7', 'last_30', 'this_month', 'last_month', 'prev_and_this_month'];

  try {
    const db = getFirestore(adminApp);

    // 1. Try to read from pre-cached range document in Firestore (skip if refreshing)
    if (!refreshParam && rangeParam && validRanges.includes(rangeParam)) {
      try {
        const cachedDoc = await db.collection('reports')
          .doc('top_users')
          .collection('ranges')
          .doc(rangeParam)
          .get();

        if (cachedDoc.exists) {
          const data = cachedDoc.data();
          if (data && data.customers) {
            return NextResponse.json({
              customers: data.customers,
              cachedAt: data.cachedAt || new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error(`Failed to read top-users cache for range ${rangeParam}:`, err);
        // Fall back to live query
      }
    }

    const now = Date.now();

    // Refresh cache if expired, empty, or explicit refresh requested
    if (!cache || (now - cache.timestamp > CACHE_DURATION_MS) || refreshParam) {
      // For live queries/fallback, limit search window to 30 days to avoid full table scans and timeouts
      const todayForLimit = new Date();
      todayForLimit.setHours(23, 59, 59, 999);
      const limitDate = new Date(todayForLimit.getTime() - 30 * 24 * 60 * 60 * 1000);
      const limitDateStr = limitDate.toISOString();

      const packagesSnap = await db.collection('packages')
        .where('latest_scan_at', '>=', limitDateStr)
        .get();

      const packages = packagesSnap.docs.map(doc => doc.data() as PackageRecord);

      cache = {
        packages,
        timestamp: now
      };
    }

    const { packages } = cache;

    // Parse date ranges
    let today = new Date();
    today.setHours(23, 59, 59, 999);

    let startDate = new Date(0);
    let endDate = new Date(today);

    if (startDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
    }
    if (endDateParam) {
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    }

    const t = endDate.getTime();
    const currentWeekStart = t - 7 * 24 * 60 * 60 * 1000;
    const currentMonthStart = t - 30 * 24 * 60 * 60 * 1000;
    
    const weeklyAvgStart = t - 35 * 24 * 60 * 60 * 1000;
    const weeklyAvgEnd = currentWeekStart;
    
    const monthlyAvgStart = t - 120 * 24 * 60 * 60 * 1000;
    const monthlyAvgEnd = currentMonthStart;

    const statsMap: Record<string, CustomerStats> = {};

    packages.forEach(pkg => {
      const hasExcludedScan = pkg.scans?.some(scan => {
        const type = scan.scan_type?.toLowerCase() || '';
        return type.includes('allocate') || type.includes('stockzee');
      });
      if (hasExcludedScan) return;

      let customerNsId = null;
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find(s => s.customer_ns_id);
        if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id;
      }

      if (!customerNsId) return;

      if (!statsMap[customerNsId]) {
        statsMap[customerNsId] = {
          id: customerNsId,
          name: 'Unlinked Customer',
          franchisee: 'Unassigned',
          allTimeBarcodes: 0,
          currentWeekScans: 0,
          currentMonthScans: 0,
          weeklyAverage: 0,
          monthlyAverage: 0,
          deliverySpeeds: {},
          lastScanDate: null
        };
      }

      let scanDate = parseDateString(pkg.latest_scan_at || '');
      if (isNaN(scanDate.getTime())) {
        scanDate = parseDateString(pkg.sync_date);
      }
      if (isNaN(scanDate.getTime()) && pkg.scans && pkg.scans.length > 0) {
        scanDate = parseDateString(pkg.scans[0].updated_at);
      }

      if (!isNaN(scanDate.getTime())) {
        const st = scanDate.getTime();

        const currentLastScan = statsMap[customerNsId].lastScanDate ? new Date(statsMap[customerNsId].lastScanDate!) : null;
        if (!currentLastScan || scanDate > currentLastScan) {
          statsMap[customerNsId].lastScanDate = scanDate.toISOString();
        }

        if (st >= startDate.getTime() && st <= endDate.getTime()) {
          statsMap[customerNsId].allTimeBarcodes += 1;
          
          const seenSpeeds = new Set<string>();
          pkg.scans?.forEach(s => {
            if (s.delivery_speed && !seenSpeeds.has(s.delivery_speed)) {
              seenSpeeds.add(s.delivery_speed);
              statsMap[customerNsId].deliverySpeeds[s.delivery_speed] = (statsMap[customerNsId].deliverySpeeds[s.delivery_speed] || 0) + 1;
            }
          });
        }

        if (st >= currentWeekStart && st <= t) {
          statsMap[customerNsId].currentWeekScans += 1;
        } else if (st >= weeklyAvgStart && st < weeklyAvgEnd) {
          statsMap[customerNsId].weeklyAverage += 0.25;
        }

        if (st >= currentMonthStart && st <= t) {
          statsMap[customerNsId].currentMonthScans += 1;
        } else if (st >= monthlyAvgStart && st < monthlyAvgEnd) {
          statsMap[customerNsId].monthlyAverage += 1/3;
        }
      }
    });

    // Filter and extract top 100
    const top100 = Object.values(statsMap)
      .filter(stat => stat.allTimeBarcodes > 0 || stat.weeklyAverage > 0 || stat.monthlyAverage > 0)
      .sort((a, b) => b.allTimeBarcodes - a.allTimeBarcodes)
      .slice(0, 100);

    // Fetch company/lead details for only the top 100 customers
    const top100NsIds = top100.map(s => s.id);
    const companyMap: Record<string, CompanyMapEntry> = {};

    if (top100NsIds.length > 0) {
      const companyPromises = [];
      const leadPromises = [];
      for (let i = 0; i < top100NsIds.length; i += 30) {
        const chunk = top100NsIds.slice(i, i + 30);
        companyPromises.push(db.collection('companies').where('internalid', 'in', chunk).get());
        leadPromises.push(db.collection('leads').where('internalid', 'in', chunk).get());
      }

      const [cSnaps, lSnaps] = await Promise.all([
        Promise.all(companyPromises),
        Promise.all(leadPromises)
      ]);

      const processDocs = (snaps: any[], type: 'companies' | 'leads') => {
        snaps.forEach(snap => {
          snap.docs.forEach((doc: any) => {
            const data = doc.data();
            if (data.internalid) {
              companyMap[String(data.internalid)] = {
                id: doc.id,
                name: data.companyName || 'Unknown Company',
                franchisee: data.franchisee || 'Unassigned',
                type
              };
            }
          });
        });
      };

      processDocs(cSnaps, 'companies');
      processDocs(lSnaps, 'leads');

      // Populate company details back into top100 stats
      top100.forEach(stat => {
        const company = companyMap[stat.id];
        if (company) {
          stat.companyId = company.id;
          stat.type = company.type;
          stat.name = company.name;
          stat.franchisee = company.franchisee;
        }
      });
    }

    // Fetch last activity for top 100 customers in parallel
    await Promise.all(top100.map(async (stat) => {
      if (!stat.companyId || !stat.type) {
        stat.lastContact = null;
        return;
      }
      try {
        const activitySnap = await db.collection(stat.type)
          .doc(stat.companyId)
          .collection('activity')
          .orderBy('date', 'desc')
          .limit(1)
          .get();

        if (!activitySnap.empty) {
          const act = activitySnap.docs[0].data();
          stat.lastContact = {
            date: act.date || null,
            type: act.type || null,
            author: act.author || null,
            notes: act.notes || null
          };
        } else {
          stat.lastContact = null;
        }
      } catch (err) {
        console.error(`Failed to fetch activity for ${stat.companyId}`, err);
        stat.lastContact = null;
      }
    }));

    // Save to Firestore ranges cache if we computed a preset range
    if (rangeParam && validRanges.includes(rangeParam)) {
      try {
        await db.collection('reports')
          .doc('top_users')
          .collection('ranges')
          .doc(rangeParam)
          .set({
            customers: top100,
            cachedAt: new Date(now).toISOString()
          });
      } catch (err) {
        console.error(`Failed to update top-users Firestore cache for range ${rangeParam}:`, err);
      }
    }

    return NextResponse.json({
      customers: top100,
      cachedAt: new Date(cache.timestamp).toISOString()
    });
  } catch (error) {
    console.error('Failed to aggregate top users:', error);
    return NextResponse.json({ error: 'Failed to aggregate top users' }, { status: 500 });
  }
}
