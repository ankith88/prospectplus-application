import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getQuickDateRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ScanRecord {
  id: number;
  scan_type: string;
  courier: string;
  updated_at: string;
  customer_ns_id?: string;
  delivery_speed?: string;
  product_type?: string;
  depot_id?: string;
}

interface PackageRecord {
  code: string;
  order_number: string;
  sync_date: string;
  scans: ScanRecord[];
  real_time_status?: {
    status: string;
    last_location?: string;
    estimated_delivery_date?: string;
    updated_at: string;
  };
  latest_scan_at?: string;
}

const AU_HOLIDAYS = [
  '2024-01-01', '2024-01-26', '2024-03-29', '2024-04-01', '2024-04-25', '2024-06-10', '2024-12-25', '2024-12-26',
  '2025-01-01', '2025-01-27', '2025-04-18', '2025-04-21', '2025-04-25', '2025-06-09', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-01-26', '2026-04-03', '2026-04-06', '2026-04-25', '2026-06-08', '2026-12-25', '2026-12-28',
  '2027-01-01', '2027-01-26', '2027-03-26', '2027-03-29', '2027-04-25', '2027-06-14', '2027-12-25', '2027-12-28'
];

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

const toYMD = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getFormattedDateDDMMYYYY = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const d = parseDateString(dateString);
  if (isNaN(d.getTime())) return 'Unknown';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
};

const addWorkingDays = (startDate: Date | string, days: number) => {
  let date = typeof startDate === 'string' ? parseDateString(startDate) : new Date(startDate);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  let count = 0;
  while (count < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      if (!AU_HOLIDAYS.includes(toYMD(date))) {
        count++;
      }
    }
  }
  return date;
};

const getLocalIsoDate = (dateString?: string) => {
  if (!dateString) return 'Unknown';
  const d = parseDateString(dateString);
  if (isNaN(d.getTime())) return 'Unknown';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getSortableTime = (str: string) => {
  if (!str) return 0;
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d.getTime();
  const match = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (match) {
    d = new Date(`${match[3]}-${match[2]}-${match[1]}T${match[4] || '00:00:00'}`);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
};

const normalizeStatus = (status: string) => {
  if (!status) return 'Unknown';
  const lower = status.toLowerCase();
  
  if (lower.includes('in transit') || lower.includes('in_transit')) {
    return 'In Transit';
  }
  
  if (lower.includes('awaiting collection') || lower.includes('collection at') || lower.includes('ready for collection')) {
    return 'Awaiting Collection';
  }
  
  if (lower.includes('delivered') || lower.includes('collected')) {
    return 'Delivered / Collected';
  }
  
  if (lower.includes('onboard for delivery') || lower.includes('out for delivery')) {
    return 'Out for Delivery';
  }
  
  if (lower.includes('arrived at depot') || lower.includes('at depot') || lower.includes('facility')) {
    return 'At Facility / Depot';
  }
  
  if (lower.includes('exception') || lower.includes('delay') || lower.includes('lost') || lower.includes('alert') || lower.includes('attempt') || lower.includes('futile')) {
    return 'Exception / Delayed';
  }
  
  return status.replace(/_/g, ' ');
};

const getPeriods = (filterDateRange: string, customStartDate: string, customEndDate: string) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let currentStart = new Date(todayStart);
  let currentEnd = new Date(today);
  let prevStart = new Date(todayStart);
  let prevEnd = new Date(today);

  if (filterDateRange && filterDateRange !== 'all' && filterDateRange !== 'custom') {
    const helperParam = filterDateRange === 'last_7' ? 'last7' : (filterDateRange === 'last_30' ? 'last30' : filterDateRange);
    const range = getQuickDateRange(helperParam);
    currentStart = range.from;
    currentEnd = range.to;
    
    const diffTime = currentEnd.getTime() - currentStart.getTime();
    prevEnd = new Date(currentStart.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - diffTime);
  } else if (filterDateRange === 'custom') {
    if (customStartDate) {
      currentStart = new Date(customStartDate);
      currentStart.setHours(0,0,0,0);
    } else {
      currentStart = new Date(0);
    }
    if (customEndDate) {
      currentEnd = new Date(customEndDate);
      currentEnd.setHours(23,59,59,999);
    }
    const diffTime = currentEnd.getTime() - currentStart.getTime();
    prevEnd = new Date(currentStart.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - diffTime);
  } else { // 'all'
    currentStart = new Date(0);
    prevStart = new Date(0);
    prevEnd = new Date(0);
  }

  return { currentStart, currentEnd, prevStart, prevEnd };
};

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Filters
    const filterBarcode = searchParams.get('filterBarcode') || '';
    const filterConnoteNumber = searchParams.get('filterConnoteNumber') || '';
    const filterCustomer = searchParams.get('filterCustomer') || '';
    const filterUnlinked = searchParams.get('filterUnlinked') === 'true';
    const filterDateRange = searchParams.get('filterDateRange') || 'this_month';
    const customStartDate = searchParams.get('customStartDate') || '';
    const customEndDate = searchParams.get('customEndDate') || '';

    // Multi-select lists (comma-separated strings)
    const selectedSpeed = searchParams.get('selectedSpeed') ? searchParams.get('selectedSpeed')!.split(',').filter(Boolean) : [];
    const selectedScanType = searchParams.get('selectedScanType') ? searchParams.get('selectedScanType')!.split(',').filter(Boolean) : [];
    const selectedCourier = searchParams.get('selectedCourier') ? searchParams.get('selectedCourier')!.split(',').filter(Boolean) : [];
    const selectedFranchise = searchParams.get('selectedFranchise') ? searchParams.get('selectedFranchise')!.split(',').filter(Boolean) : [];

    const db = getFirestore(adminApp);
    const now = new Date();

    // Determine query date range
    let dateLimit = new Date(now.getFullYear(), now.getMonth() - 1, 1); // default to start of previous month
    const { prevStart, currentStart, currentEnd, prevEnd } = getPeriods(filterDateRange, customStartDate, customEndDate);
    if (prevStart && !isNaN(prevStart.getTime()) && prevStart.getTime() > 0) {
      dateLimit = prevStart;
    }

    if (filterDateRange === 'all') {
      dateLimit = new Date(now.getFullYear(), now.getMonth() - 6, 1); // limit all-time to last 6 months to prevent crashing
    }

    // Shifting query limit date back by 30 days buffer
    const queryDateLimit = new Date(dateLimit);
    if (filterDateRange !== 'all') {
      queryDateLimit.setDate(queryDateLimit.getDate() - 30);
    }

    // Fetch partner locations
    const partnerLocationMap: Record<string, { id: string, name: string }> = {};
    const pLocSnap = await db.collection('partner_locations').get();
    pLocSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.internalId || doc.id) {
        const key = String(data.internalId || doc.id);
        partnerLocationMap[key] = { id: doc.id, name: data.name || 'Unknown Location' };
      }
    });

    const courierCount: Record<string, number> = {};
    const speedCount: Record<string, number> = {};
    const franchiseeCount: Record<string, number> = {};
    const partnerLocationCount: Record<string, number> = {};
    const customerCount: Record<string, number> = {};
    const dateCount: Record<string, number> = {};
    const productTypeDaily: Record<string, Record<string, number>> = {};
    const uniqueProductTypes = new Set<string>();
    const statusCount: Record<string, number> = {};
    const locationCount: Record<string, number> = {};
    let totalTransitDays = 0;
    let deliveredWithTransitTimeCount = 0;
    let onTimeDeliveryCount = 0;
    let totalDeliveredWithSyncDate = 0;
    let exceptionCount = 0;
    let missingRealTimeStatusCount = 0;
    let notDeliveredCount = 0;
    let etaVarianceSum = 0;
    let totalScans = 0;
    const lateDeliveries: Array<any> = [];
    const activeExceptions: Array<any> = [];

    // Filter sets for options passed to UI
    const uniqueScanTypesSet = new Set<string>();
    const uniqueCouriersSet = new Set<string>();
    const uniqueSpeedsSet = new Set<string>();
    const uniqueFranchiseesSet = new Set<string>();

    // Customer Health Metrics
    const customerUsage: Record<string, {
      name: string;
      companyId: string | null;
      firstScanDate: Date | null;
      lastScanDate: Date | null;
      currentPeriodScans: number;
      prevPeriodScans: number;
      currentPeriodUniquePackages: Set<string>;
    }> = {};

    let filteredCount = 0;

    // Cache to resolve companies/leads
    const companyCache = new Map<string, { id: string, name: string, franchisee?: string } | null>();

    const getCompanyInfo = async (nsId: string) => {
      const key = String(nsId);
      if (companyCache.has(key)) {
        return companyCache.get(key);
      }

      // Check companies
      let compSnap = await db.collection('companies').where('internalid', '==', key).limit(1).get();
      if (compSnap.empty) {
        const nsIdNum = Number(key);
        if (!isNaN(nsIdNum)) {
          compSnap = await db.collection('companies').where('internalid', '==', nsIdNum).limit(1).get();
        }
      }
      if (!compSnap.empty) {
        const doc = compSnap.docs[0];
        const data = doc.data();
        const info = {
          id: doc.id,
          name: data.companyName || 'Unknown Company',
          franchisee: data.franchisee || 'Unassigned'
        };
        companyCache.set(key, info);
        return info;
      }

      // Check leads
      let leadSnap = await db.collection('leads').where('internalid', '==', key).limit(1).get();
      if (leadSnap.empty) {
        const nsIdNum = Number(key);
        if (!isNaN(nsIdNum)) {
          leadSnap = await db.collection('leads').where('internalid', '==', nsIdNum).limit(1).get();
        }
      }
      if (!leadSnap.empty) {
        const doc = leadSnap.docs[0];
        const data = doc.data();
        const info = {
          id: doc.id,
          name: data.companyName || 'Unknown Company',
          franchisee: data.franchisee || 'Unassigned'
        };
        companyCache.set(key, info);
        return info;
      }

      companyCache.set(key, null);
      return null;
    };

    // Stream query
    const query = db.collection('packages')
      .where('latest_scan_at', '>=', queryDateLimit.toISOString())
      .select('code', 'order_number', 'sync_date', 'scans', 'real_time_status', 'latest_scan_at', 'customer_name', 'franchisee_name');

    const packagesStream = query.stream();

    for await (const doc of packagesStream) {
      const pkg = doc.data() as PackageRecord;

      // Extract unique items for filtering options
      pkg.scans?.forEach(scan => {
        if (scan.scan_type) uniqueScanTypesSet.add(scan.scan_type);
        if (scan.courier) uniqueCouriersSet.add(scan.courier);
        if (scan.delivery_speed) uniqueSpeedsSet.add(scan.delivery_speed);
      });
      if (pkg.franchisee_name) {
        uniqueFranchiseesSet.add(pkg.franchisee_name);
      }

      let customerNsId = null;
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find(s => s.customer_ns_id);
        if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id;
      }

      let companyName = pkg.customer_name || '';
      let franchisee = pkg.franchisee_name || 'Unassigned';
      let companyId: string | null = null;

      // Resolve company info if needed
      const rawStatus = pkg.real_time_status?.status || 'Unknown';
      const rtStatus = normalizeStatus(rawStatus);
      const isDelivered = rtStatus.toLowerCase().includes('delivered');
      const isException = rtStatus.toLowerCase().includes('exception') || rtStatus.toLowerCase().includes('delay') || rtStatus.toLowerCase().includes('lost') || rtStatus.toLowerCase().includes('alert') || rtStatus.toLowerCase().includes('attempt');
      
      const needsLookup = !pkg.customer_name || !pkg.franchisee_name || isException || (isDelivered && pkg.sync_date);

      if (customerNsId && needsLookup) {
        const company = await getCompanyInfo(customerNsId);
        if (company) {
          companyName = company.name;
          franchisee = company.franchisee || 'Unassigned';
          companyId = company.id;
        }
      }

      const companyLower = companyName.toLowerCase();

      // Customer Health Metrics (for all packages)
      const custHealthName = companyName || 'Unlinked';
      if (!customerUsage[custHealthName]) {
        customerUsage[custHealthName] = {
          name: custHealthName,
          companyId: companyId,
          firstScanDate: null,
          lastScanDate: null,
          currentPeriodScans: 0,
          prevPeriodScans: 0,
          currentPeriodUniquePackages: new Set<string>()
        };
      } else if (companyId && !customerUsage[custHealthName].companyId) {
        customerUsage[custHealthName].companyId = companyId;
      }

      const allDates: Date[] = [];
      if (pkg.sync_date) allDates.push(parseDateString(pkg.sync_date));
      pkg.scans?.forEach(s => {
        if (s.updated_at) allDates.push(parseDateString(s.updated_at));
      });

      allDates.forEach(d => {
        if (isNaN(d.getTime())) return;
        
        if (!customerUsage[custHealthName].firstScanDate || d < customerUsage[custHealthName].firstScanDate!) {
          customerUsage[custHealthName].firstScanDate = d;
        }
        if (!customerUsage[custHealthName].lastScanDate || d > customerUsage[custHealthName].lastScanDate!) {
          customerUsage[custHealthName].lastScanDate = d;
        }

        if (d >= currentStart && d <= currentEnd) {
          customerUsage[custHealthName].currentPeriodScans++;
          if (pkg.code) customerUsage[custHealthName].currentPeriodUniquePackages.add(pkg.code);
        } else if (d >= prevStart && d <= prevEnd) {
          customerUsage[custHealthName].prevPeriodScans++;
        }
      });

      // Filter check
      let matchesFilter = true;

      if (filterUnlinked && (companyName !== '' && companyName !== 'Unlinked')) matchesFilter = false;

      if (matchesFilter && filterBarcode && (!pkg.code || typeof pkg.code !== 'string' || !pkg.code.toLowerCase().includes(filterBarcode.toLowerCase()))) matchesFilter = false;
      if (matchesFilter && filterConnoteNumber) {
        let hasConnoteMatch = false;
        if (pkg.connote_number && typeof pkg.connote_number === 'string' && pkg.connote_number.toLowerCase().includes(filterConnoteNumber.toLowerCase())) {
          hasConnoteMatch = true;
        } else if (pkg.connote_numbers && Array.isArray(pkg.connote_numbers) && pkg.connote_numbers.some((num: string) => num.toLowerCase().includes(filterConnoteNumber.toLowerCase()))) {
          hasConnoteMatch = true;
        } else if (pkg.scans && Array.isArray(pkg.scans) && pkg.scans.some((s: any) => s.connote_number && typeof s.connote_number === 'string' && s.connote_number.toLowerCase().includes(filterConnoteNumber.toLowerCase()))) {
          hasConnoteMatch = true;
        }
        if (!hasConnoteMatch) matchesFilter = false;
      }
      if (matchesFilter && !filterUnlinked && filterCustomer && !companyLower.includes(filterCustomer.toLowerCase())) matchesFilter = false;
      
      const isSpecificSearch = filterBarcode.trim() !== '' || filterConnoteNumber.trim() !== '';
      
      if (matchesFilter && filterDateRange !== 'all' && !isSpecificSearch) {
        const checkDate = (dateStr: string) => {
          if (!dateStr) return false;
          let d = parseDateString(dateStr);
          if (isNaN(d.getTime())) return false;

          d.setHours(0, 0, 0, 0);

          if (filterDateRange === 'custom') {
            const start = customStartDate ? new Date(customStartDate) : null;
            if (start) start.setHours(0,0,0,0);
            const end = customEndDate ? new Date(customEndDate) : null;
            if (end) end.setHours(23,59,59,999);

            if (start && end) return d >= start && d <= end;
            if (start) return d >= start;
            if (end) return d <= end;
            return true;
          }
          
          const helperParam = filterDateRange === 'last_7' ? 'last7' : (filterDateRange === 'last_30' ? 'last30' : filterDateRange);
          const range = getQuickDateRange(helperParam);
          const fromDate = new Date(range.from);
          fromDate.setHours(0,0,0,0);
          const toDate = new Date(range.to || range.from);
          toDate.setHours(23,59,59,999);
          
          return d >= fromDate && d <= toDate;
        };

        const hasMatchingScan = pkg.scans?.some(scan => checkDate(scan.updated_at));
        if (!hasMatchingScan && !checkDate(pkg.sync_date)) {
          matchesFilter = false;
        }
      }
      
      let latestScanFilter = pkg.scans?.[pkg.scans.length - 1];
      if (matchesFilter && pkg.scans && pkg.scans.length > 0) {
        latestScanFilter = pkg.scans.reduce((latest, current) => {
          return getSortableTime(latest.updated_at) > getSortableTime(current.updated_at) ? latest : current;
        }, pkg.scans[0]);
      }

      if (matchesFilter && selectedSpeed.length > 0 && (!latestScanFilter?.delivery_speed || !selectedSpeed.includes(latestScanFilter.delivery_speed))) matchesFilter = false;
      if (matchesFilter && selectedScanType.length > 0 && (!latestScanFilter?.scan_type || !selectedScanType.includes(latestScanFilter.scan_type))) matchesFilter = false;
      if (matchesFilter && selectedCourier.length > 0 && (!latestScanFilter?.courier || !selectedCourier.includes(latestScanFilter.courier))) matchesFilter = false;
      if (matchesFilter && selectedFranchise.length > 0 && (!franchisee || !selectedFranchise.includes(franchisee))) matchesFilter = false;

      // Exclude packages if they contain a "Futile", "Allocate", or "Stockzee" scan
      if (matchesFilter) {
        const hasExcludedScan = pkg.scans?.some(scan => {
          const type = scan.scan_type?.toLowerCase() || '';
          return type.includes('futile') || type.includes('allocate') || type.includes('stockzee');
        });
        if (hasExcludedScan) matchesFilter = false;
      }

      if (!matchesFilter) continue;

      filteredCount++;

      const seenDates = new Set<string>();
      const seenDateProd = new Set<string>();
      const seenCouriers = new Set<string>();
      const seenSpeeds = new Set<string>();
      const scanLen = pkg.scans?.length || 0;

      totalScans += scanLen;
      if (scanLen > 0) {
        franchiseeCount[franchisee] = (franchiseeCount[franchisee] || 0) + 1;
        customerCount[companyName || 'Unlinked'] = (customerCount[companyName || 'Unlinked'] || 0) + 1;
        
        let latestScan = pkg.scans?.[pkg.scans.length - 1];
        if (pkg.scans && pkg.scans.length > 0) {
          latestScan = pkg.scans.reduce((latest, current) => {
            return getSortableTime(latest.updated_at) > getSortableTime(current.updated_at) ? latest : current;
          }, pkg.scans[0]);
        }
        
        const depotId = latestScan?.depot_id;
        if (depotId && partnerLocationMap[depotId]) {
          const locName = partnerLocationMap[depotId].name;
          partnerLocationCount[locName] = (partnerLocationCount[locName] || 0) + 1;
        }
      }

      statusCount[rtStatus] = (statusCount[rtStatus] || 0) + 1;

      if (!pkg.real_time_status) {
        missingRealTimeStatusCount++;
      } else if (!rtStatus.toLowerCase().includes('delivered')) {
        notDeliveredCount++;
      }

      if (isException) {
        exceptionCount++;
        activeExceptions.push({
          barcode: pkg.code,
          status: pkg.real_time_status?.status || 'Unknown',
          last_location: pkg.real_time_status?.last_location || 'Unknown',
          updated_at: getLocalIsoDate(pkg.real_time_status?.updated_at),
          customer: companyName || 'Unlinked',
          order_number: pkg.order_number || 'N/A',
          companyId: companyId
        });
      }

      if (!isDelivered && pkg.real_time_status?.last_location) {
        const loc = pkg.real_time_status.last_location;
        locationCount[loc] = (locationCount[loc] || 0) + 1;
      }

      if (isDelivered && pkg.scans && pkg.scans.length > 0 && pkg.real_time_status?.updated_at) {
        const firstScan = pkg.scans.reduce((earliest, current) => {
          return getSortableTime(earliest.updated_at) < getSortableTime(current.updated_at) ? earliest : current;
        }, pkg.scans[0]);
        
        const firstScanDate = new Date(firstScan.updated_at);
        const deliveredDate = new Date(pkg.real_time_status.updated_at);
        
        if (!isNaN(firstScanDate.getTime()) && !isNaN(deliveredDate.getTime())) {
          const diffTime = deliveredDate.getTime() - firstScanDate.getTime();
          if (diffTime >= 0) {
            const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            totalTransitDays += diffDays;
            deliveredWithTransitTimeCount++;
          }
        }

        if (pkg.sync_date) {
           const syncDateObj = parseDateString(pkg.sync_date);
           const expectedDeliveryDate = addWorkingDays(syncDateObj, 2);
           const dDateOnly = new Date(deliveredDate.getFullYear(), deliveredDate.getMonth(), deliveredDate.getDate());
           
           if (expectedDeliveryDate && !isNaN(dDateOnly.getTime())) {
             totalDeliveredWithSyncDate++;
             if (dDateOnly <= expectedDeliveryDate) {
               onTimeDeliveryCount++;
             } else {
               lateDeliveries.push({
                 barcode: pkg.code,
                 delivered_date: getFormattedDateDDMMYYYY(pkg.real_time_status.updated_at),
                 sync_date: getFormattedDateDDMMYYYY(pkg.sync_date),
                 status: pkg.real_time_status.status || 'Unknown',
                 last_location: pkg.real_time_status.last_location || 'Unknown',
                 customer: companyName || 'Unlinked',
                 order_number: pkg.order_number || 'N/A',
                 companyId: companyId
               });
             }
             const diffDays = (dDateOnly.getTime() - expectedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24);
             etaVarianceSum += diffDays;
           }
        }
      }

      pkg.scans?.forEach(scan => {
        const courier = scan.courier ? scan.courier.replace('_', ' ') : 'Unknown';
        if (!seenCouriers.has(courier)) {
          seenCouriers.add(courier);
          courierCount[courier] = (courierCount[courier] || 0) + 1;
        }
        
        const speed = scan.delivery_speed || 'Unknown';
        if (!seenSpeeds.has(speed)) {
          seenSpeeds.add(speed);
          speedCount[speed] = (speedCount[speed] || 0) + 1;
        }

        const date = getLocalIsoDate(scan.updated_at);
        if (!seenDates.has(date)) {
          seenDates.add(date);
          dateCount[date] = (dateCount[date] || 0) + 1;
        }
        
        const prodType = scan.product_type || 'Unknown';
        uniqueProductTypes.add(prodType);
        const dateProdKey = `${date}|${prodType}`;
        if (!seenDateProd.has(dateProdKey)) {
          seenDateProd.add(dateProdKey);
          if (!productTypeDaily[date]) productTypeDaily[date] = {};
          productTypeDaily[date][prodType] = (productTypeDaily[date][prodType] || 0) + 1;
        }
      });
    }

    const activeCustomers: any[] = [];
    const newCustomers: any[] = [];
    const droppedCustomers: any[] = [];
    const atRiskCustomers: any[] = [];

    // Rolling 12-week metrics
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const twelveWeeksData: { weekLabel: string, startDate: Date, endDate: Date, newCount: number, lostCount: number }[] = [];
    for (let i = 11; i >= 0; i--) {
       const wEnd = new Date(todayEnd);
       wEnd.setDate(todayEnd.getDate() - (i * 7));
       const wStart = new Date(wEnd);
       wStart.setDate(wEnd.getDate() - 6);
       wStart.setHours(0, 0, 0, 0);
       
       twelveWeeksData.push({
         weekLabel: getFormattedDateDDMMYYYY(toYMD(wStart)),
         startDate: wStart,
         endDate: wEnd,
         newCount: 0,
         lostCount: 0
       });
    }

    const newCustomersLast12Weeks: any[] = [];
    const lostCustomersLast12Weeks: any[] = [];

    let totalActiveCurrentScans = 0;
    let totalActiveCurrentUniquePackages = 0;

    Object.values(customerUsage).forEach(cu => {
      if (cu.name === 'Unlinked') return;

      // 12 Weeks Logic
      if (cu.firstScanDate) {
        const weekNew = twelveWeeksData.find(w => cu.firstScanDate! >= w.startDate && cu.firstScanDate! <= w.endDate);
        if (weekNew) {
           weekNew.newCount++;
           newCustomersLast12Weeks.push({
             name: cu.name,
             companyId: cu.companyId,
             firstScanDate: cu.firstScanDate.toISOString()
           });
        }
      }
      
      if (cu.lastScanDate) {
        const lostDate = new Date(cu.lastScanDate);
        lostDate.setDate(lostDate.getDate() + 56); // 8 weeks later
        
        const weekLost = twelveWeeksData.find(w => lostDate >= w.startDate && lostDate <= w.endDate);
        if (weekLost) {
           weekLost.lostCount++;
           lostCustomersLast12Weeks.push({
             name: cu.name,
             companyId: cu.companyId,
             lastScanDate: cu.lastScanDate.toISOString()
           });
        }
      }

      if (cu.currentPeriodScans > 0) {
        activeCustomers.push({
          name: cu.name,
          companyId: cu.companyId,
          currentPeriodScans: cu.currentPeriodScans,
          prevPeriodScans: cu.prevPeriodScans
        });
        totalActiveCurrentScans += cu.currentPeriodScans;
        totalActiveCurrentUniquePackages += cu.currentPeriodUniquePackages.size;

        // New customer check
        if (cu.firstScanDate && cu.firstScanDate >= currentStart && cu.firstScanDate <= currentEnd) {
          newCustomers.push({
            name: cu.name,
            companyId: cu.companyId,
            firstScanDate: cu.firstScanDate.toISOString(),
            currentPeriodScans: cu.currentPeriodScans
          });
        }

        // At risk check
        if (cu.prevPeriodScans > 10 && cu.currentPeriodScans < (cu.prevPeriodScans * 0.5)) {
          atRiskCustomers.push({
            name: cu.name,
            companyId: cu.companyId,
            currentPeriodScans: cu.currentPeriodScans,
            prevPeriodScans: cu.prevPeriodScans
          });
        }
      } else if (cu.prevPeriodScans > 0) {
        droppedCustomers.push({
          name: cu.name,
          companyId: cu.companyId,
          currentPeriodScans: cu.currentPeriodScans,
          prevPeriodScans: cu.prevPeriodScans
        });
      }
    });

    const avgUniqueBarcodesPerActive = activeCustomers.length > 0 ? (totalActiveCurrentUniquePackages / activeCustomers.length).toFixed(1) : '0';
    
    let prevActiveCount = 0;
    let retainedCount = 0;
    Object.values(customerUsage).forEach(cu => {
      if (cu.name === 'Unlinked') return;
      if (cu.prevPeriodScans > 0) {
        prevActiveCount++;
        if (cu.currentPeriodScans > 0) {
          retainedCount++;
        }
      }
    });
    const retentionRate = prevActiveCount > 0 ? ((retainedCount / prevActiveCount) * 100).toFixed(1) : 'N/A';

    const toChartData = (obj: Record<string, number>, limit = 20) => {
      return Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    };

    const productTypeDailyArr = Object.entries(productTypeDaily)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
      
    const timelineArr = Object.entries(dateCount)
      .map(([date, value]) => ({ date, scans: value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);

    // Compute unique options for filters to pass back so client doesn't need to compute them
    const scanTypes = Array.from(uniqueScanTypesSet)
      .map(s => ({label: s, value: s})).sort((a, b) => a.label.localeCompare(b.label));
    const couriers = Array.from(uniqueCouriersSet)
      .map(c => ({label: c.replace('_', ' '), value: c})).sort((a, b) => a.label.localeCompare(b.label));
    const speeds = Array.from(uniqueSpeedsSet)
      .map(s => ({label: s, value: s})).sort((a, b) => a.label.localeCompare(b.label));
    const franchisees = Array.from(uniqueFranchiseesSet)
      .map(f => ({label: f, value: f})).sort((a, b) => a.label.localeCompare(b.label));

    const responseData = {
      metrics: {
        totalPackages: filteredCount,
        missingRealTimeStatusCount,
        notDeliveredCount,
        totalScans,
        avgTransitDays: deliveredWithTransitTimeCount > 0 ? (totalTransitDays / deliveredWithTransitTimeCount).toFixed(1) : 'N/A',
        onTimeRate: totalDeliveredWithSyncDate > 0 ? ((onTimeDeliveryCount / totalDeliveredWithSyncDate) * 100).toFixed(1) : 'N/A',
        avgEtaVariance: totalDeliveredWithSyncDate > 0 ? (etaVarianceSum / totalDeliveredWithSyncDate).toFixed(1) : 'N/A',
        lateDeliveries,
        activeExceptions,
        exceptionCount,
        courierData: toChartData(courierCount),
        speedData: toChartData(speedCount, 10),
        franchiseeData: toChartData(franchiseeCount, 15),
        partnerLocationData: toChartData(partnerLocationCount, 15),
        customerData: toChartData(customerCount, 15),
        totalUniqueCustomers: Object.keys(customerCount).length,
        totalUniqueFranchisees: Object.keys(franchiseeCount).length,
        statusData: toChartData(statusCount, 20),
        locationData: toChartData(locationCount, 15),
        timelineData: timelineArr,
        productTypeDailyData: productTypeDailyArr,
        productTypes: Array.from(uniqueProductTypes),
        retentionRate,
        avgUniqueBarcodesPerActive,
        activeCustomersList: activeCustomers.sort((a,b) => b.currentPeriodScans - a.currentPeriodScans),
        newCustomersList: newCustomers.sort((a,b) => b.currentPeriodScans - a.currentPeriodScans),
        droppedCustomersList: droppedCustomers.sort((a,b) => b.prevPeriodScans - a.prevPeriodScans),
        atRiskCustomersList: atRiskCustomers.sort((a,b) => b.prevPeriodScans - a.prevPeriodScans),
        twelveWeeksData: twelveWeeksData.map(w => ({ weekLabel: w.weekLabel, newCount: w.newCount, lostCount: -w.lostCount })),
        newCustomersLast12Weeks: newCustomersLast12Weeks.sort((a, b) => new Date(b.firstScanDate).getTime() - new Date(a.firstScanDate).getTime()),
        lostCustomersLast12Weeks: lostCustomersLast12Weeks.sort((a, b) => new Date(b.lastScanDate).getTime() - new Date(a.lastScanDate).getTime()),
        prevPeriodString: filterDateRange !== 'all' ? `(${getFormattedDateDDMMYYYY(toYMD(prevStart))} to ${getFormattedDateDDMMYYYY(toYMD(prevEnd))})` : '',
        currentPeriodString: filterDateRange !== 'all' ? `(${getFormattedDateDDMMYYYY(toYMD(currentStart))} to ${getFormattedDateDDMMYYYY(toYMD(currentEnd))})` : '',
      },
      filtersOptions: {
        uniqueScanTypes: scanTypes,
        uniqueCouriers: couriers,
        uniqueSpeeds: speeds,
        uniqueFranchisees: franchisees
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Failed to aggregate scans report:', error);
    return NextResponse.json({ error: 'Failed to aggregate scans report' }, { status: 500 });
  }
}
