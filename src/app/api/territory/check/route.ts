import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

interface CachedTerritoryData {
  territoryMap: Map<string, { ids: string[]; names: string[] }>;
  lastUpdated: number;
}

let cache: CachedTerritoryData | null = null;
let isRefreshing = false;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

async function getTerritoryMap(forceRefresh = false): Promise<Map<string, { ids: string[]; names: string[] }>> {
  const now = Date.now();
  if (!forceRefresh && cache && (now - cache.lastUpdated < CACHE_TTL_MS)) {
    return cache.territoryMap;
  }

  // If a refresh is already in progress and we have stale cache, return stale cache to avoid thundering herd
  if (isRefreshing && cache) {
    return cache.territoryMap;
  }

  isRefreshing = true;
  try {
    const db = getFirestore(adminApp);
    const franchiseesSnap = await db.collection('franchisees').get();

    const newMap = new Map<string, { ids: string[]; names: string[] }>();

    franchiseesSnap.forEach(doc => {
      const data = doc.data();
      const fId = data.internalId || doc.id;
      const fName = data.name || data.franchiseeName || doc.id;
      const territories = data.territoryJson || [];

      for (const t of territories) {
        if (!t.post_code || !t.suburbs) continue;
        const zip = String(t.post_code).trim();
        const city = String(t.suburbs).trim().toUpperCase();
        const key = `${zip}_${city}`;

        let entry = newMap.get(key);
        if (!entry) {
          entry = { ids: [], names: [] };
          newMap.set(key, entry);
        }
        if (!entry.ids.includes(fId)) {
          entry.ids.push(fId);
          entry.names.push(fName);
        }
      }
    });

    cache = {
      territoryMap: newMap,
      lastUpdated: Date.now()
    };

    return newMap;
  } finally {
    isRefreshing = false;
  }
}

export async function POST(req: NextRequest) {
  const apiKeyHeader = req.headers.get('x-api-key');
  const API_KEY = process.env.PROSPECTPLUS_API_KEY || '454e75f843954875ccff72537d7702ba1ab6f65c';

  if (apiKeyHeader !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { postcode, city, forceRefresh } = body;

    if (!postcode || !city) {
      return NextResponse.json({ error: 'postcode and city are required' }, { status: 400 });
    }

    const zipTrimmed = String(postcode).trim();
    const cityTrimmed = String(city).trim().toUpperCase();

    const map = await getTerritoryMap(Boolean(forceRefresh));
    const key = `${zipTrimmed}_${cityTrimmed}`;
    const matched = map.get(key) || { ids: [], names: [] };

    const serviceable = matched.ids.length > 0;

    return NextResponse.json({
      serviceable,
      franchisees: matched.names,
      franchiseeIds: matched.ids,
      count: matched.ids.length
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error: any) {
    console.error('Error checking territory:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

