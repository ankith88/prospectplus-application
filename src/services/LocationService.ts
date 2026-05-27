import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export class LocationService {
  private watchId: number | null = null;
  private readonly GEOFENCE_RADIUS_METERS = 50;
  private checkInState: Record<string, boolean> = {}; // Tracks whether we are already checked in to a lead

  // Haversine formula to calculate distance between two points in meters
  public static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  public startBackgroundTracking(userId: string, activeLeads: { id: string; lat: number; lng: number; radius?: number }[]) {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    // PWA-friendly geolocation tracking
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.checkGeofences(userId, latitude, longitude, activeLeads);
      },
      (error) => {
        console.error('Error tracking location:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    );
  }

  public stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private async checkGeofences(userId: string, currentLat: number, currentLng: number, leads: { id: string; lat: number; lng: number; radius?: number }[]) {
    for (const lead of leads) {
      const distance = LocationService.calculateDistance(currentLat, currentLng, lead.lat, lead.lng);
      const radius = lead.radius || this.GEOFENCE_RADIUS_METERS;

      const isInside = distance <= radius;
      const wasInside = this.checkInState[lead.id] || false;

      if (isInside && !wasInside) {
        // Crossed the perimeter (Entry)
        this.checkInState[lead.id] = true;
        await this.logVisitEvent(userId, lead.id, currentLat, currentLng, 'check-in');
      } else if (!isInside && wasInside) {
        // Crossed the perimeter (Exit)
        this.checkInState[lead.id] = false;
        await this.logVisitEvent(userId, lead.id, currentLat, currentLng, 'check-out');
      }
    }
  }

  private async logVisitEvent(userId: string, leadId: string, lat: number, lng: number, eventType: 'check-in' | 'check-out') {
    try {
      const visitEventsRef = collection(db, 'VisitEvents');
      await addDoc(visitEventsRef, {
        userId,
        leadId,
        timestamp: serverTimestamp(),
        eventType,
        coordinates: { lat, lng }
      });
      console.log(`Successfully logged ${eventType} for lead ${leadId}`);
    } catch (error) {
      console.error('Failed to log visit event:', error);
    }
  }
}

export const locationService = new LocationService();
