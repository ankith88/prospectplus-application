'use client';

import { useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES: ('places' | 'drawing' | 'geometry' | 'visualization')[] = [
  'places',
  'drawing',
  'geometry',
  'visualization',
];

export function useGoogleMapsScript() {
  return useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });
}
