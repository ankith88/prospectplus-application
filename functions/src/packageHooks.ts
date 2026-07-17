import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const onPackageWrite = functions
  .region("australia-southeast1")
  .firestore.document("packages/{packageId}")
  .onWrite(async (change, context) => {
    const afterData = change.after.data();
    const beforeData = change.before.data();
    const packageId = context.params.packageId;

    if (!afterData) {
      // Document deleted
      return;
    }

    // --- 0. Initialize is_delivered ---
    if (typeof afterData.is_delivered === 'undefined') {
      const isDelivered = afterData.real_time_status?.delivered === true;
      await change.after.ref.set({ is_delivered: isDelivered }, { merge: true });
      afterData.is_delivered = isDelivered;
    }

    // --- 1. Denormalization ---
    let customerNsId = null;
    if (afterData.scans && Array.isArray(afterData.scans)) {
      const scanWithNsId = afterData.scans.find((s: any) => s.customer_ns_id);
      if (scanWithNsId) {
        customerNsId = scanWithNsId.customer_ns_id;
      }
    }

    // Determine latest scan date from the scans array
    let latestScanAt = afterData.latest_scan_at || null;
    let connoteNumbers: string[] = [];
    let latestConnoteNumber = "";
    if (afterData.scans && Array.isArray(afterData.scans) && afterData.scans.length > 0) {
      const latestScan = afterData.scans[afterData.scans.length - 1];
      if (latestScan && latestScan.updated_at) {
        latestScanAt = latestScan.updated_at;
      }
      connoteNumbers = afterData.scans
        .map((s: any) => s.connote_number)
        .filter((val: any) => typeof val === 'string' && val.trim() !== '');
      connoteNumbers = Array.from(new Set(connoteNumbers));
      
      if (latestScan && latestScan.connote_number) {
        latestConnoteNumber = latestScan.connote_number;
      } else if (connoteNumbers.length > 0) {
        latestConnoteNumber = connoteNumbers[0];
      }
    }

    // Check if we need to fetch and update
    // Only update if customer_ns_id changed or if names are missing
    const previousCustomerNsId = beforeData?.scans?.find((s: any) => s.customer_ns_id)?.customer_ns_id;
    const needsDenormalization = customerNsId && (!afterData.customer_name || customerNsId !== previousCustomerNsId);

    const updatePayload: any = {};
    if (latestScanAt && afterData.latest_scan_at !== latestScanAt) {
      updatePayload.latest_scan_at = latestScanAt;
    }

    const hasConnoteNumbersChanged = !afterData.connote_numbers || 
      JSON.stringify(afterData.connote_numbers) !== JSON.stringify(connoteNumbers);
    if (hasConnoteNumbersChanged && connoteNumbers.length > 0) {
      updatePayload.connote_numbers = connoteNumbers;
    }

    if (latestConnoteNumber && afterData.connote_number !== latestConnoteNumber) {
      updatePayload.connote_number = latestConnoteNumber;
    }

    if (needsDenormalization) {
      try {
        let customerName = afterData.customer_name || 'Unlinked';
        let franchiseeName = afterData.franchisee_name || 'Unassigned';

        // Query companies collection where internalid == customerNsId
        // Also check leads if not found in companies
        let companyFound = false;
        
        const companiesQuery = await db.collection("companies").where("internalid", "==", Number(customerNsId)).limit(1).get();
        if (!companiesQuery.empty) {
          const compData = companiesQuery.docs[0].data();
          customerName = compData.companyName || 'Unknown Company';
          franchiseeName = compData.franchisee || 'Unassigned';
          companyFound = true;
        } else {
          // Check string internalid just in case
          const companiesQueryStr = await db.collection("companies").where("internalid", "==", String(customerNsId)).limit(1).get();
          if (!companiesQueryStr.empty) {
            const compData = companiesQueryStr.docs[0].data();
            customerName = compData.companyName || 'Unknown Company';
            franchiseeName = compData.franchisee || 'Unassigned';
            companyFound = true;
          }
        }

        if (!companyFound) {
           const leadsQuery = await db.collection("leads").where("internalid", "==", Number(customerNsId)).limit(1).get();
           if (!leadsQuery.empty) {
             const leadData = leadsQuery.docs[0].data();
             customerName = leadData.companyName || 'Unknown Company';
             franchiseeName = leadData.franchisee || 'Unassigned';
           } else {
              const leadsQueryStr = await db.collection("leads").where("internalid", "==", String(customerNsId)).limit(1).get();
              if (!leadsQueryStr.empty) {
                 const leadData = leadsQueryStr.docs[0].data();
                 customerName = leadData.companyName || 'Unknown Company';
                 franchiseeName = leadData.franchisee || 'Unassigned';
              }
           }
        }

        updatePayload.customer_name = customerName;
        updatePayload.franchisee_name = franchiseeName;

      } catch (error) {
        functions.logger.error(`Failed to denormalize package ${packageId}:`, error);
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      await change.after.ref.set(updatePayload, { merge: true });
    }

    // --- 2. Metrics Aggregation (Future enhancement placeholder) ---
    // Incremental updates have been omitted here in favor of a scheduled aggregator
    // to prevent document write contention on global metrics.
  });

export const aggregateScanMetrics = functions
  .region("australia-southeast1")
  .runWith({ memory: "1GB", timeoutSeconds: 540 })
  .pubsub.schedule("0 * * * *") // Run every hour
  .onRun(async (context) => {
    functions.logger.info("Starting scheduled scan metrics aggregation...");

    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // We will aggregate metrics for the current month
      const packagesRef = db.collection("packages");
      // Getting all packages for the month using sync_date (format DD-MM-YYYY)
      // Since format is DD-MM-YYYY, string comparison is tricky. We'll fetch all and filter in memory for now, 
      // or we can just fetch the recent ones. Since it's a server function, memory is less of an issue than client.
      const snapshot = await packagesRef.get();
      
      let totalPackages = 0;
      let totalScans = 0;
      let onTimeDeliveryCount = 0;
      let totalDeliveredWithSyncDate = 0;
      let exceptionCount = 0;

      const courierCount: Record<string, number> = {};
      const statusCount: Record<string, number> = {};

      for (const doc of snapshot.docs) {
        const pkg = doc.data();
        
        // Basic date check - only aggregate recent
        if (!pkg.updated_at) continue;
        const updatedAtDate = pkg.updated_at.toDate ? pkg.updated_at.toDate() : new Date(pkg.updated_at);
        if (updatedAtDate < firstDayOfMonth) continue;

        totalPackages++;
        const scanLen = pkg.scans?.length || 0;
        totalScans += scanLen;

        const rtStatus = pkg.real_time_status?.status || 'Unknown';
        statusCount[rtStatus] = (statusCount[rtStatus] || 0) + 1;

        if (rtStatus.toLowerCase().includes('exception') || rtStatus.toLowerCase().includes('delay')) {
          exceptionCount++;
        }

        if (rtStatus.toLowerCase().includes('delivered') && pkg.scans && pkg.scans.length > 0) {
           // Simplistic calc for aggregation
           totalDeliveredWithSyncDate++;
           onTimeDeliveryCount++; // dummy logic for now to prevent heavy CPU
        }
        
        pkg.scans?.forEach((scan: any) => {
           const courier = scan.courier ? scan.courier.replace('_', ' ') : 'Unknown';
           courierCount[courier] = (courierCount[courier] || 0) + 1;
        });
      }

      await db.collection("metrics").doc("scan_dashboard").set({
        this_month: {
          totalPackages,
          totalScans,
          exceptionCount,
          onTimeRate: totalDeliveredWithSyncDate > 0 ? ((onTimeDeliveryCount / totalDeliveredWithSyncDate) * 100).toFixed(1) : 'N/A',
          couriers: courierCount,
          statuses: statusCount,
          last_updated: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });

      functions.logger.info("Scan metrics aggregation completed successfully.");

      // Run top users aggregation in background during scheduled run
      await cacheTopUsersReport(db);
    } catch (error) {
      functions.logger.error("Error aggregating scan metrics:", error);
    }
  });

export async function cacheTopUsersReport(db: admin.firestore.Firestore) {
  functions.logger.info("Starting top users report caching...");
  
  // 1. Fetch all packages in the last 60 days to aggregate in memory
  const todayForLimit = new Date();
  todayForLimit.setHours(23, 59, 59, 999);
  const limitDate = new Date(todayForLimit.getTime() - 60 * 24 * 60 * 60 * 1000);
  const limitDateStr = limitDate.toISOString();

  const packagesSnap = await db.collection('packages')
    .where('latest_scan_at', '>=', limitDateStr)
    .get();

  const packages = packagesSnap.docs.map(doc => doc.data());
  functions.logger.info(`Fetched ${packages.length} packages for top users aggregation.`);
  
  const presets = [
    'today',
    'yesterday',
    'this_week',
    'last_7',
    'last_30',
    'this_month',
    'last_month',
    'prev_and_this_month'
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

  const now = new Date();
  
  const getDatesForPreset = (preset: string) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
    const endOfDay = (d: Date) => { const r = new Date(d); r.setHours(23,59,59,999); return r; };
    const subDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; };
    
    switch (preset) {
      case 'today':
        return { from: startOfDay(today), to: endOfDay(today) };
      case 'yesterday': {
        const yesterday = subDays(today, 1);
        return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
      }
      case 'this_week': {
        const start = new Date(today);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        return { from: startOfDay(start), to: endOfDay(today) };
      }
      case 'last_7': {
        const start = subDays(today, 7);
        return { from: startOfDay(start), to: endOfDay(today) };
      }
      case 'last_30': {
        const start = subDays(today, 30);
        return { from: startOfDay(start), to: endOfDay(today) };
      }
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: startOfDay(start), to: endOfDay(today) };
      }
      case 'last_month': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: startOfDay(start), to: endOfDay(end) };
      }
      case 'prev_and_this_month': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return { from: startOfDay(start), to: endOfDay(today) };
      }
      default:
        return { from: new Date(0), to: endOfDay(today) };
    }
  };

  for (const preset of presets) {
    const { from: startDate, to: endDate } = getDatesForPreset(preset);
    
    const t = endDate.getTime();
    const currentWeekStart = t - 7 * 24 * 60 * 60 * 1000;
    const currentMonthStart = t - 30 * 24 * 60 * 60 * 1000;
    
    const weeklyAvgStart = t - 35 * 24 * 60 * 60 * 1000;
    const weeklyAvgEnd = currentWeekStart;
    
    const monthlyAvgStart = t - 120 * 24 * 60 * 60 * 1000;
    const monthlyAvgEnd = currentMonthStart;

    const statsMap: Record<string, any> = {};

    packages.forEach(pkg => {
      const hasExcludedScan = pkg.scans?.some((scan: any) => {
        const type = scan.scan_type?.toLowerCase() || '';
        return type.includes('allocate') || type.includes('stockzee');
      });
      if (hasExcludedScan) return;

      let customerNsId = null;
      if (pkg.scans && pkg.scans.length > 0) {
        const scanWithNsId = pkg.scans.find((s: any) => s.customer_ns_id);
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
          pkg.scans?.forEach((s: any) => {
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

    const top100 = Object.values(statsMap)
      .filter((stat: any) => stat.allTimeBarcodes > 0 || stat.weeklyAverage > 0 || stat.monthlyAverage > 0)
      .sort((a: any, b: any) => b.allTimeBarcodes - a.allTimeBarcodes)
      .slice(0, 100);

    const top100NsIds = top100.map((s: any) => s.id);
    const companyMap: Record<string, any> = {};

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

      top100.forEach((stat: any) => {
        const company = companyMap[stat.id];
        if (company) {
          stat.companyId = company.id;
          stat.type = company.type;
          stat.name = company.name;
          stat.franchisee = company.franchisee;
        }
      });
    }

    await Promise.all(top100.map(async (stat: any) => {
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
        functions.logger.error(`Failed to fetch activity for ${stat.companyId}`, err);
        stat.lastContact = null;
      }
    }));

    // Save this range's report to Firestore
    await db.collection("reports")
      .doc("top_users")
      .collection("ranges")
      .doc(preset)
      .set({
        customers: top100,
        cachedAt: now.toISOString()
      });
      
    functions.logger.info(`Successfully cached top users report for range: ${preset}`);
  }
}

