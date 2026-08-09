import { NextResponse } from 'next/server';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface BoundaryResult {
  paths: LatLngLiteral[][];
  center: LatLngLiteral;
  isFallback: boolean;
}

// In-memory cache for fetched boundary polygon paths & centroids
const boundaryCache = new Map<string, BoundaryResult>();

export const STATE_CENTERS: Record<string, LatLngLiteral> = {
  NSW: { lat: -33.8688, lng: 151.2093 },
  VIC: { lat: -37.8136, lng: 144.9631 },
  QLD: { lat: -27.4698, lng: 153.0251 },
  WA:  { lat: -31.9505, lng: 115.8605 },
  SA:  { lat: -34.9285, lng: 138.6007 },
  TAS: { lat: -42.8821, lng: 147.3272 },
  ACT: { lat: -35.2809, lng: 149.1300 },
  NT:  { lat: -12.4634, lng: 130.8456 },
};

export function inferStateFromPostcode(postcode?: string | number): string {
  if (!postcode) return '';
  const code = parseInt(String(postcode).trim(), 10);
  if (isNaN(code)) return '';

  if ((code >= 1000 && code <= 2599) || (code >= 2619 && code <= 2899) || (code >= 2921 && code <= 2999)) return 'NSW';
  if (code >= 2600 && code <= 2618) return 'ACT';
  if (code >= 3000 && code <= 3999) return 'VIC';
  if (code >= 4000 && code <= 4999) return 'QLD';
  if (code >= 5000 && code <= 5999) return 'SA';
  if (code >= 6000 && code <= 6999) return 'WA';
  if (code >= 7000 && code <= 7999) return 'TAS';
  if (code >= 800 && code <= 999) return 'NT';

  return '';
}

export function getApproxStateCoordinates(state?: string, postcode?: string | number): LatLngLiteral {
  let st = (state || '').trim().toUpperCase();
  if (!st || !STATE_CENTERS[st]) {
    st = inferStateFromPostcode(postcode);
  }

  const base = STATE_CENTERS[st] || STATE_CENTERS.NSW;
  return {
    lat: Number((base.lat + (Math.random() - 0.5) * 0.1).toFixed(6)),
    lng: Number((base.lng + (Math.random() - 0.5) * 0.1).toFixed(6)),
  };
}

/**
 * Calculates center of a polygon ring array
 */
function calculateCentroid(paths: LatLngLiteral[][]): LatLngLiteral | null {
  let totalLat = 0, totalLng = 0, count = 0;
  for (const ring of paths) {
    for (const pt of ring) {
      totalLat += pt.lat;
      totalLng += pt.lng;
      count++;
    }
  }
  return count > 0 ? { lat: Number((totalLat / count).toFixed(6)), lng: Number((totalLng / count).toFixed(6)) } : null;
}

/**
 * Generates a smoothed multi-vertex polygon (16 vertices) around center lat/lng
 * when real OpenStreetMap boundary GeoJSON is unavailable for obscure localities.
 */
function generateFallbackPolygon(lat: number, lng: number, radiusKm: number = 2.4): LatLngLiteral[][] {
  const points: LatLngLiteral[] = [];
  const numVertices = 16;
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i < numVertices; i++) {
    const angle = (i * 2 * Math.PI) / numVertices;
    const factor = 0.88 + 0.24 * Math.sin(i * 3 + lat * 10);
    const pLat = lat + latRadius * Math.sin(angle) * factor;
    const pLng = lng + lngRadius * Math.cos(angle) * factor;
    points.push({ lat: Number(pLat.toFixed(6)), lng: Number(pLng.toFixed(6)) });
  }

  if (points.length > 0) {
    points.push({ ...points[0] });
  }

  return [points];
}

/**
 * Converts GeoJSON Polygon or MultiPolygon coordinates into Google Maps LatLngLiteral[][]
 */
function parseGeoJsonGeometry(geometry: any): LatLngLiteral[][] {
  if (!geometry || !geometry.coordinates) return [];

  const result: LatLngLiteral[][] = [];

  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      const path: LatLngLiteral[] = ring.map((pt: [number, number]) => ({
        lat: pt[1],
        lng: pt[0],
      }));
      if (path.length >= 3) {
        result.push(path);
      }
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        const path: LatLngLiteral[] = ring.map((pt: [number, number]) => ({
          lat: pt[1],
          lng: pt[0],
        }));
        if (path.length >= 3) {
          result.push(path);
        }
      }
    }
  }

  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const suburb = (searchParams.get('suburb') || '').trim();
  const state = (searchParams.get('state') || '').trim();
  const postcode = (searchParams.get('postcode') || '').trim();
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  let centerLat = latStr ? parseFloat(latStr) : null;
  let centerLng = lngStr ? parseFloat(lngStr) : null;

  // Check if center is missing or erroneously in Central Australia / off-coast
  const isInvalidCenter = centerLat === null || centerLng === null || isNaN(centerLat) || isNaN(centerLng) || (centerLat < -27 && centerLat > -28 && centerLng > 132 && centerLng < 135);

  if (isInvalidCenter) {
    const approx = getApproxStateCoordinates(state, postcode);
    centerLat = approx.lat;
    centerLng = approx.lng;
  }

  const cacheKey = `${suburb.toLowerCase()}_${state.toLowerCase()}_${postcode}`;

  if (boundaryCache.has(cacheKey)) {
    return NextResponse.json(boundaryCache.get(cacheKey)!);
  }

  // Query Nominatim for suburb boundary GeoJSON
  if (suburb) {
    try {
      const queryStr = `${suburb}${state ? `, ${state}` : ''}${postcode ? ` ${postcode}` : ''}, Australia`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=geojson&polygon_geojson=1&limit=3`;
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ProspectPlus-TerritoryMap/1.0 (internal-logistics-crm)',
          'Accept-Language': 'en',
        },
        next: { revalidate: 86400 },
      } as any);

      if (res.ok) {
        const data = await res.json();
        const features = data.features || [];

        // Find best boundary feature (locality, suburb, administrative)
        const boundaryFeature = features.find((f: any) => 
          (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') &&
          (f.properties?.addresstype === 'suburb' || f.properties?.addresstype === 'locality' || f.properties?.category === 'boundary')
        ) || features.find((f: any) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon');

        if (boundaryFeature) {
          const parsedPaths = parseGeoJsonGeometry(boundaryFeature.geometry);
          if (parsedPaths.length > 0) {
            const trueCentroid = calculateCentroid(parsedPaths) || { lat: centerLat!, lng: centerLng! };
            const val: BoundaryResult = { paths: parsedPaths, center: trueCentroid, isFallback: false };
            boundaryCache.set(cacheKey, val);
            return NextResponse.json(val);
          }
        }
      }
    } catch (err) {
      console.warn(`[Territory Boundary API] Failed to fetch OSM boundary for ${suburb}:`, err);
    }
  }

  // Fallback to smoothed polygon around state capital area
  const fallbackPaths = generateFallbackPolygon(centerLat!, centerLng!);
  const val: BoundaryResult = { paths: fallbackPaths, center: { lat: centerLat!, lng: centerLng! }, isFallback: true };
  boundaryCache.set(cacheKey, val);
  return NextResponse.json(val);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: { suburb: string; state?: string; postcode?: string; lat?: number; lng?: number }[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ results: {} });
    }

    const results: Record<string, BoundaryResult> = {};
    const batch = items.slice(0, 40);

    for (const item of batch) {
      const suburb = (item.suburb || '').trim();
      const state = (item.state || '').trim();
      const postcode = (item.postcode || '').trim();
      const key = `${suburb.toLowerCase()}_${state.toLowerCase()}_${postcode}`;

      if (boundaryCache.has(key)) {
        results[key] = boundaryCache.get(key)!;
        continue;
      }

      const center = (item.lat && item.lng) 
        ? { lat: item.lat, lng: item.lng }
        : getApproxStateCoordinates(state, postcode);

      const fallback: BoundaryResult = { paths: generateFallbackPolygon(center.lat, center.lng), center, isFallback: true };
      boundaryCache.set(key, fallback);
      results[key] = fallback;
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Batch failed' }, { status: 500 });
  }
}
