export interface Place {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  category: string | null;
  experienceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MapViewProps {
  places: Place[];
  accessLevel: "admin" | "customer" | "no_access";
  experienceId: string;
}

export interface NewPlacePosition {
  lng: number;
  lat: number;
}

export interface GeocodingResult {
  lng: number;
  lat: number;
  fullAddress: string;
}

declare global {
  interface Window {
    deletePlace: (placeId: string) => Promise<void>;
  }
} 