"use client";

import { useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { MapViewProps, NewPlacePosition } from './map/types';
import MapContainer from './map/MapContainer';
import PlaceControlPanel from './map/PlaceControlPanel';
import PlacesList from './map/PlacesList';

// Create proper SVG pin marker
const createPinMarker = (color = '#dc2626') => {
  const markerEl = document.createElement('div');
  markerEl.innerHTML = `
    <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.372 0 0 5.372 0 12C0 18.628 12 30 12 30S24 18.628 24 12C24 5.372 18.628 0 12 0Z" fill="${color}"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `;
  markerEl.style.cursor = 'pointer';
  markerEl.style.width = '24px';
  markerEl.style.height = '30px';
  markerEl.style.display = 'block';
  markerEl.style.border = 'none';
  markerEl.style.borderRadius = '0';
  markerEl.style.padding = '0';
  return markerEl;
};

export default function MapView({
  places,
  accessLevel,
  experienceId,
}: MapViewProps) {
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlacePosition, setNewPlacePosition] = useState<NewPlacePosition | null>(null);
  const newMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const updateNewMarker = (lng: number, lat: number) => {
    if (!mapRef.current) return;
    
    // Remove existing new marker
    if (newMarkerRef.current) {
      newMarkerRef.current.remove();
    }
    
    // Create new marker element with proper green pin
    const markerEl = createPinMarker('#10b981'); // Green color for new place
    
    // Add new marker with proper anchor
    newMarkerRef.current = new mapboxgl.Marker({ 
      element: markerEl,
      anchor: 'bottom'
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
  };

  const handleDeletePlace = async (placeId: string) => {
    if (!confirm("Are you sure you want to delete this place?")) return;

    try {
      const response = await fetch(
        `/api/experiences/${experienceId}/places/${placeId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete place");
      }

      // Refresh the page to remove the deleted place
      window.location.reload();
    } catch (error) {
      console.error("Error deleting place:", error);
    }
  };

  const handleMapReady = (map: mapboxgl.Map) => {
    mapRef.current = map;
  };

  if (accessLevel === "no_access") {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 bg-[rgb(12,12,35)]">
        You don't have access to view this map.
      </div>
    );
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
  if (!mapboxToken) {
    return (
      <PlacesList 
        places={places}
        accessLevel={accessLevel}
        onDeletePlace={handleDeletePlace}
      />
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MapContainer
        places={places}
        accessLevel={accessLevel}
        experienceId={experienceId}
        isAddingPlace={isAddingPlace}
        newPlacePosition={newPlacePosition}
        setNewPlacePosition={setNewPlacePosition}
        updateNewMarker={updateNewMarker}
        onDeletePlace={handleDeletePlace}
        onMapReady={handleMapReady}
      />
      
      {accessLevel === "admin" && (
        <PlaceControlPanel
          experienceId={experienceId}
          isAddingPlace={isAddingPlace}
          setIsAddingPlace={setIsAddingPlace}
          newPlacePosition={newPlacePosition}
          setNewPlacePosition={setNewPlacePosition}
          updateNewMarker={updateNewMarker}
          map={mapRef.current}
        />
      )}
    </div>
  );
} 