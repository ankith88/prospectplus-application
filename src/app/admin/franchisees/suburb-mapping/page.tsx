'use client';

import SuburbMappingClient from '../../../../components/admin/suburb-mapping-client';

export default function SuburbMappingPage() {
  return (
    <div className="flex-1 h-full w-full p-4 flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Franchisee Suburb & Lodgement Mapping</h2>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-sm bg-white">
        <SuburbMappingClient />
      </div>
    </div>
  );
}
