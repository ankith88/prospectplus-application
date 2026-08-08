import { NextResponse } from 'next/server';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

// In-memory cache for fetched boundary polygon paths
const boundaryCache = new Map<string, { paths: LatLngLiteral[][]; isFallback: boolean }>();

/**
 * Generates a smoothed multi-vertex polygon (16 vertices) around center lat/lng
 * when real OpenStreetMap boundary GeoJSON is unavailable for obscure localities.
 */
function generateFallbackPolygon(lat: number, lng: number, radiusKm: number = 2.4): LatLngLiteral[][] {
  const points: LatLngLiteral[] = [];
  const numVertices = 16;
  const latRadius = radiusKm / 111; // ~111km per degree lat
  const lngRadius = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  for (let i = 0; i < numVertices; i++) {
    const angle = (i * 2 * Math.PI) / numVertices;
    // Add subtle irregularity to mimic natural boundary shapes
    const factor = 0.88 + 0.24 * Math.sin(i * 3 + lat * 10);
    const pLat = lat + latRadius * Math.sin(angle) * factor;
    const pLng = lng + lngRadius * Math.cos(angle) * factor;
    points.push({ lat: Number(pLat.toFixed(6)), lng: Number(pLng.toFixed(6)) });
  }

  // Close loop
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
    // Array of coordinate rings (outer boundary + optional holes)
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
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  const centerLat = latStr ? parseFloat(latStr) : null;
  const centerLng = lngStr ? parseFloat(lngStr) : null;

  if (!suburb && (centerLat === null || centerLng === null)) {
    return NextResponse.json({ error: 'Missing suburb or coordinates' }, { status: 400 });
  }

  const cacheKey = `${suburb.toLowerCase()}_${state.toLowerCase()}_${centerLat?.toFixed(3) || '0'}_${centerLng?.toFixed(3) || '0'}`;

  if (boundaryCache.has(cacheKey)) {
    return NextResponse.json(boundaryCache.get(cacheKey)!);
  }

  // Attempt Nominatim boundary fetch
  if (suburb) {
    try {
      const queryStr = `${suburb}${state ? `, ${state}` : ''}, Australia`;
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
            const val = { paths: parsedPaths, isFallback: false };
            boundaryCache.set(cacheKey, val);
            return NextResponse.json(val);
          }
        }
      }
    } catch (err) {
      console.warn(`[Territory Boundary API] Failed to fetch OSM boundary for ${suburb}:`, err);
    }
  }

  // Fallback to smoothed polygon if center coordinates are available
  if (centerLat !== null && !isNaN(centerLat) && centerLng !== null && !isNaN(centerLng)) {
    const fallbackPaths = generateFallbackPolygon(centerLat, centerLng);
    const val = { paths: fallbackPaths, isFallback: true };
    boundaryCache.set(cacheKey, val);
    return NextResponse.json(val);
  }

  return NextResponse.json({ paths: [], isFallback: true }, { status: 404 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: { suburb: string; state?: string; lat?: number; lng?: number }[] = body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ results: {} });
    }

    const results: Record<string, { paths: LatLngLiteral[][]; isFallback: boolean }> = {};

    // Process up to 40 items in batch
    const batch = items.slice(0, 40);

    for (const item of batch) {
      const suburb = (item.suburb || '').trim();
      const state = (item.state || '').trim();
      const lat = item.lat;
      const lng = item.lng;
      const key = `${suburb.toLowerCase()}_${state.toLowerCase()}`;

      if (boundaryCache.has(key)) {
        results[key] = boundaryCache.get(key)!;
        continue;
      }

      // If lat/lng available, generate fallback immediately to ensure high responsiveness
      if (lat !== undefined && !isNaN(lat) && lng !== undefined && !isNaN(lng)) {
        const fallback = { paths: generateFallbackPolygon(lat, lng), isFallback: true };
        boundaryCache.set(key, fallback);
        results[key] = fallback;
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Batch failed' }, { status: 500 });
  }
}
