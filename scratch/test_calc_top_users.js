const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Let's test cacheTopUsersReport logic directly
async function testCacheTopUsersReport() {
  console.time('fullTopUsersCache');
  
  const todayForLimit = new Date();
  todayForLimit.setHours(23, 59, 59, 999);
  const limitDate = new Date(todayForLimit.getTime() - 60 * 24 * 60 * 60 * 1000);
  const limitDateStr = limitDate.toISOString();

  console.log('Fetching packages since', limitDateStr);
  console.time('fetchPackages');
  const packagesSnap = await db.collection('packages')
    .where('latest_scan_at', '>=', limitDateStr)
    .select('scans', 'sync_date', 'latest_scan_at')
    .get();
  console.timeEnd('fetchPackages');
  console.log(`Fetched ${packagesSnap.docs.length} packages.`);

  const packages = packagesSnap.docs.map(doc => doc.data());

  const parseDateString = (dateStr) => {
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

  const preset = 'prev_and_this_month';
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endDate = today;

  const t = endDate.getTime();
  const currentWeekStart = t - 7 * 24 * 60 * 60 * 1000;
  const currentMonthStart = t - 30 * 24 * 60 * 60 * 1000;
  const weeklyAvgStart = t - 35 * 24 * 60 * 60 * 1000;
  const weeklyAvgEnd = currentWeekStart;
  const monthlyAvgStart = t - 120 * 24 * 60 * 60 * 1000;
  const monthlyAvgEnd = currentMonthStart;

  const statsMap = {};

  packages.forEach(pkg => {
    const hasExcludedScan = pkg.scans?.some((scan) => {
      const type = scan.scan_type?.toLowerCase() || '';
      return type.includes('allocate') || type.includes('stockzee');
    });
    if (hasExcludedScan) return;

    let customerNsId = null;
    if (pkg.scans && pkg.scans.length > 0) {
      const scanWithNsId = pkg.scans.find((s) => s.customer_ns_id);
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

      const currentLastScan = statsMap[customerNsId].lastScanDate ? new Date(statsMap[customerNsId].lastScanDate) : null;
      if (!currentLastScan || scanDate > currentLastScan) {
        statsMap[customerNsId].lastScanDate = scanDate.toISOString();
      }

      if (st >= startDate.getTime() && st <= endDate.getTime()) {
        statsMap[customerNsId].allTimeBarcodes += 1;
        
        const seenSpeeds = new Set();
        pkg.scans?.forEach((s) => {
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
    .filter((stat) => stat.allTimeBarcodes > 0 || stat.weeklyAverage > 0 || stat.monthlyAverage > 0)
    .sort((a, b) => b.allTimeBarcodes - a.allTimeBarcodes)
    .slice(0, 100);

  console.log(`Computed top 100. Sample customer:`, top100[0]);

  // Fetch company/lead details
  const top100NsIds = top100.map((s) => s.id);
  const companyMap = {};

  if (top100NsIds.length > 0) {
    const companyPromises = [];
    const leadPromises = [];
    for (let i = 0; i < top100NsIds.length; i += 30) {
      const chunk = top100NsIds.slice(i, i + 30);
      const chunkNum = chunk.map(id => Number(id)).filter(id => !isNaN(id));

      companyPromises.push(db.collection('companies').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get());
      if (chunkNum.length > 0) {
        companyPromises.push(db.collection('companies').where('internalid', 'in', chunkNum).get());
      }
      leadPromises.push(db.collection('leads').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get());
      if (chunkNum.length > 0) {
        leadPromises.push(db.collection('leads').where('internalid', 'in', chunkNum).get());
      }
    }

    const [cSnaps, lSnaps] = await Promise.all([
      Promise.all(companyPromises),
      Promise.all(leadPromises)
    ]);

    const processDocs = (snaps, type) => {
      snaps.forEach(snap => {
        snap.docs.forEach((doc) => {
          const data = doc.data();
          const internalId = String(data.internalid || doc.id);
          const prospectPlusId = data.prospectPlusId || doc.id;
          const primaryContact = data.contacts && data.contacts.length > 0 ? data.contacts[0] : null;
          const contactName = primaryContact?.name || data.discoveryData?.personSpokenWithName || data.contactPerson || data.contactName || '';
          const phone = data.customerPhone || primaryContact?.phone || data.phone || '';
          const email = data.customerServiceEmail || primaryContact?.email || data.email || '';

          const entry = {
            id: doc.id,
            prospectPlusId,
            name: data.companyName || 'Unknown Company',
            franchisee: data.franchisee || 'Unassigned',
            type,
            contactName,
            phone,
            email,
            csCalled: data.csCalled || false,
            csCallCount: data.csCallCount || 0,
            lastContactedDate: data.lastContactedDate || null
          };

          companyMap[internalId] = entry;
          companyMap[doc.id] = entry;
        });
      });
    };

    processDocs(cSnaps, 'companies');
    processDocs(lSnaps, 'leads');

    top100.forEach((stat) => {
      const company = companyMap[stat.id];
      if (company) {
        stat.companyId = company.id;
        stat.prospectPlusId = company.prospectPlusId;
        stat.type = company.type;
        stat.name = company.name;
        stat.franchisee = company.franchisee;
        stat.contactName = company.contactName;
        stat.phone = company.phone;
        stat.email = company.email;
        stat.csCalled = company.csCalled;
        stat.csCallCount = company.csCallCount;
        stat.lastContactedDate = company.lastContactedDate;
      }
    });
  }

  // Save preset report
  const nowStr = new Date().toISOString();
  await db.collection("reports")
    .doc("top_users")
    .collection("ranges")
    .doc(preset)
    .set({
      customers: top100,
      cachedAt: nowStr
    });

  console.timeEnd('fullTopUsersCache');
  console.log(`Saved report for preset ${preset} at ${nowStr}`);
}

testCacheTopUsersReport();
