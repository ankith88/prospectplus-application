import { Franchisee, SuburbMapping } from '@/lib/types';

export interface FlattenedSuburbRecord {
  franchiseeId: string;
  franchiseeName: string;
  mainContact: string;
  email: string;
  mobile: string;
  category: string;
  suburb: string;
  postcode: string;
  state: string;
  primaryOps: string;
  secondaryOp: string;
  nextDay: string;
  parentLpoId: string;
  lat: string;
  lng: string;
}

export type MappingCategoryKey = 'all' | 'territoryJson' | 'starTrackSuburbsJson' | 'tgeSuburbsJSON' | 'ironMountainSuburbsJson' | 'ausPostSuburbsJson';

export const CATEGORY_LABELS: Record<string, string> = {
  territoryJson: 'Main Territory',
  starTrackSuburbsJson: 'StarTrack',
  tgeSuburbsJSON: 'TGE',
  ironMountainSuburbsJson: 'Iron Mountain',
  ausPostSuburbsJson: 'AusPost',
};

/**
 * Extract all suburb mapping items from franchisee objects based on selected category filter
 */
export function extractSuburbRecords(
  franchisees: Franchisee[],
  categoryFilter: string = 'all',
  franchiseeFilter: string = 'all'
): FlattenedSuburbRecord[] {
  const records: FlattenedSuburbRecord[] = [];

  const categoriesToExtract: { key: keyof Franchisee; label: string }[] = [
    { key: 'territoryJson', label: 'Main Territory' },
    { key: 'starTrackSuburbsJson', label: 'StarTrack' },
    { key: 'tgeSuburbsJSON', label: 'TGE' },
    { key: 'ironMountainSuburbsJson', label: 'Iron Mountain' },
    { key: 'ausPostSuburbsJson', label: 'AusPost' },
  ];

  const targetFranchisees = franchiseeFilter !== 'all' 
    ? franchisees.filter(f => f.internalId === franchiseeFilter)
    : franchisees;

  for (const f of targetFranchisees) {
    for (const cat of categoriesToExtract) {
      if (categoryFilter !== 'all' && categoryFilter !== cat.key) {
        continue;
      }

      const suburbList = (f[cat.key] as SuburbMapping[] | undefined) || [];
      for (const item of suburbList) {
        if (!item) continue;
        const primaryOpsStr = Array.isArray(item.primary_op)
          ? item.primary_op.join('; ')
          : String(item.primary_op || '');

        let secondaryOpStr = '';
        if (typeof item.secondary_op === 'string') {
          secondaryOpStr = item.secondary_op;
        } else if (Array.isArray(item.secondary_op)) {
          secondaryOpStr = item.secondary_op.map(op => {
            if (typeof op === 'object' && op !== null) {
              return op.name || op.franchisee || op.id || JSON.stringify(op);
            }
            return String(op);
          }).join('; ');
        } else if (typeof item.secondary_op === 'object' && item.secondary_op !== null) {
          const secObj = item.secondary_op as any;
          secondaryOpStr = secObj.name || secObj.franchisee || secObj.id || JSON.stringify(secObj);
        }

        records.push({
          franchiseeId: f.internalId || f.id || '',
          franchiseeName: f.name || f.internalId || 'N/A',
          mainContact: f.mainContact || '',
          email: f.email || '',
          mobile: f.mobile || '',
          category: cat.label,
          suburb: item.suburbs || '',
          postcode: String(item.post_code || ''),
          state: item.state || '',
          primaryOps: primaryOpsStr,
          secondaryOp: secondaryOpStr,
          nextDay: item.next_day === true ? 'Yes' : item.next_day === false ? 'No' : 'N/A',
          parentLpoId: item.parent_lpo_id || '',
          lat: item.lat !== undefined && item.lat !== null ? String(item.lat) : '',
          lng: item.lng !== undefined && item.lng !== null ? String(item.lng) : '',
        });
      }
    }
  }

  return records;
}

/**
 * Formats flattened records to a CSV string and triggers a browser download
 */
export function exportSuburbMappingsToCSV(
  franchisees: Franchisee[],
  categoryFilter: string = 'all',
  franchiseeFilter: string = 'all'
): { count: number; filename: string } {
  const records = extractSuburbRecords(franchisees, categoryFilter, franchiseeFilter);

  const headers = [
    'Franchisee ID',
    'Franchisee Name',
    'Main Contact',
    'Email',
    'Mobile',
    'Mapping Category',
    'Suburb',
    'Postcode',
    'State',
    'Primary Operators',
    'Secondary Operator',
    'Next Day Delivery',
    'Parent LPO ID',
    'Latitude',
    'Longitude',
  ];

  const escapeCSV = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = records.map(r => [
    r.franchiseeId,
    r.franchiseeName,
    r.mainContact,
    r.email,
    r.mobile,
    r.category,
    r.suburb,
    r.postcode,
    r.state,
    r.primaryOps,
    r.secondaryOp,
    r.nextDay,
    r.parentLpoId,
    r.lat,
    r.lng,
  ].map(escapeCSV).join(','));

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const today = new Date().toISOString().split('T')[0];
  const catLabel = categoryFilter !== 'all' ? `_${categoryFilter}` : '';
  const franLabel = franchiseeFilter !== 'all' ? `_${franchiseeFilter}` : '';
  const filename = `franchisee_suburb_mappings${catLabel}${franLabel}_${today}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: records.length, filename };
}
