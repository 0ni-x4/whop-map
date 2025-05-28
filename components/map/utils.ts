import type { GeocodingResult } from './types';

export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  if (!address.trim()) return null;
  
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        address
      )}.json?access_token=${token}&limit=1`
    );
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lng, lat, fullAddress: data.features[0].place_name };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Simplified function to check if a point is visible on the globe
export const isPointVisible = (lngLat: [number, number], mapInstance: any): boolean => {
  const center = mapInstance.getCenter();
  
  // Convert to radians
  const lambda1 = center.lng * Math.PI / 180;
  const phi1 = center.lat * Math.PI / 180;
  const lambda2 = lngLat[0] * Math.PI / 180;
  const phi2 = lngLat[1] * Math.PI / 180;
  
  // Calculate great circle distance
  let deltaLambda = Math.abs(lambda1 - lambda2);
  
  // Handle longitude wrapping
  if (deltaLambda > Math.PI) {
    deltaLambda = 2 * Math.PI - deltaLambda;
  }
  
  const cosDist = Math.sin(phi1) * Math.sin(phi2) + 
                Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  
  // Point is visible if it's less than 90 degrees from center
  return cosDist > 0;
}; 