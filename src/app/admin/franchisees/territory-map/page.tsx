'use client';

import TerritoryMapClient from '@/components/admin/territory-map-client';

export default function TerritoryMapPage() {
  return (
    <div className="flex-1 h-full w-full p-4 flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-3xl font-bold tracking-tight">Franchisee Territory Map</h2>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-sm">
        <TerritoryMapClient />
      </div>
    </div>
  );
}
