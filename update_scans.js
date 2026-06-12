const fs = require('fs');
const file = 'src/components/scans/scans-client.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update Scan Interface
content = content.replace(
`  futile_reason?: string;
  customer_ns_id?: string;
}`,
`  futile_reason?: string;
  customer_ns_id?: string;
  email?: string;
  post_code?: string;
  state?: string;
  address1?: string;
  address2?: string;
  phone?: string;
  delivery_speed?: string;
  depot_id?: string;
  delivery_zone?: string;
}`
);

// 2. Add Input import
if (!content.includes('import { Input } from')) {
    content = content.replace(
        `import { Badge } from '@/components/ui/badge'`,
        `import { Badge } from '@/components/ui/badge'\nimport { Input } from '@/components/ui/input'`
    );
}

// 3. Add Filter state
content = content.replace(
`  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())`,
`  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [filterBarcode, setFilterBarcode] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterScanDate, setFilterScanDate] = useState('')
  const [filterSyncDate, setFilterSyncDate] = useState('')`
);

// 4. Add filtering logic before mapping
content = content.replace(
`              <TableBody>
                {packages.length === 0 ? (`,
`              <TableBody>
                {filteredPackages.length === 0 ? (`
);

content = content.replace(
`                ) : (
                  packages.map((pkg) => {`,
`                ) : (
                  filteredPackages.map((pkg) => {`
);

content = content.replace(
`  if (loading) {`,
`  const filteredPackages = packages.filter(pkg => {
    let customerNsId = null;
    if (pkg.scans && pkg.scans.length > 0) {
      const scanWithNsId = pkg.scans.find(s => s.customer_ns_id)
      if (scanWithNsId) customerNsId = scanWithNsId.customer_ns_id
    }
    const company = customerNsId ? companyMap[customerNsId] : null;
    const companyName = company ? company.name.toLowerCase() : '';

    if (filterBarcode && !pkg.code.toLowerCase().includes(filterBarcode.toLowerCase())) return false;
    if (filterCustomer && !companyName.includes(filterCustomer.toLowerCase())) return false;
    // sync_date is like DD-MM-YYYY, filterSyncDate is YYYY-MM-DD
    if (filterSyncDate) {
       const [y, m, d] = filterSyncDate.split('-');
       const formattedSync = \`\${d}-\${m}-\${y}\`;
       if (!pkg.sync_date.includes(formattedSync)) return false;
    }
    if (filterScanDate) {
      const hasMatchingScan = pkg.scans?.some(scan => scan.updated_at.startsWith(filterScanDate));
      if (!hasMatchingScan) return false;
    }
    return true;
  });

  if (loading) {`
);

// 5. Add Filters UI
content = content.replace(
`        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">`,
`        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">`
);

content = content.replace(
`        <CardContent>
          <div className="rounded-md border border-slate-200">`,
`        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Search Barcode</label>
              <Input placeholder="E.g. MP123456" value={filterBarcode} onChange={e => setFilterBarcode(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Signed Customer</label>
              <Input placeholder="E.g. Acme Corp" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Scan Date</label>
              <Input type="date" value={filterScanDate} onChange={e => setFilterScanDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Sync Date</label>
              <Input type="date" value={filterSyncDate} onChange={e => setFilterSyncDate(e.target.value)} />
            </div>
          </div>
          <div className="rounded-md border border-slate-200">`
);

// 6. Update expanded section with new details
content = content.replace(
`                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-slate-500" />
                                  Scan History
                                </h4>
                                {pkg.scans && pkg.scans.length > 0 ? (`,
`                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Package Details</h5>
                                    <div className="space-y-1 text-sm text-slate-700">
                                      <p><span className="font-medium">Manifested At:</span> {pkg.manifested_at ? new Date(pkg.manifested_at).toLocaleString() : '-'}</p>
                                      <p><span className="font-medium">Weight:</span> {pkg.weight || '-'}</p>
                                    </div>
                                  </div>
                                  <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Delivery Details</h5>
                                    <div className="space-y-1 text-sm text-slate-700">
                                      <p><span className="font-medium">Speed:</span> {latestScan?.delivery_speed || '-'}</p>
                                      <p><span className="font-medium">Zone:</span> {latestScan?.delivery_zone || '-'}</p>
                                      <p><span className="font-medium">Depot ID:</span> {latestScan?.depot_id || '-'}</p>
                                    </div>
                                  </div>
                                  <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recipient Details</h5>
                                    <div className="space-y-1 text-sm text-slate-700">
                                      <p className="font-medium">{latestScan?.receiver_name || '-'}</p>
                                      <p>{latestScan?.email || '-'}</p>
                                      <p>{latestScan?.phone || '-'}</p>
                                      <p className="text-xs text-slate-500">
                                        {[latestScan?.address1, latestScan?.address2, latestScan?.receiver_suburb, latestScan?.state, latestScan?.post_code].filter(Boolean).join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-slate-500" />
                                  Scan History
                                </h4>
                                {pkg.scans && pkg.scans.length > 0 ? (`
);

fs.writeFileSync(file, content);
