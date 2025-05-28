"use client";

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Place, NewPlacePosition } from './types';
import { mapStyles } from './styles';

interface MapContainerProps {
  places: Place[];
  accessLevel: "admin" | "customer" | "no_access";
  experienceId: string;
  isAddingPlace: boolean;
  newPlacePosition: NewPlacePosition | null;
  setNewPlacePosition: (position: NewPlacePosition | null) => void;
  updateNewMarker: (lng: number, lat: number) => void;
  onDeletePlace: (placeId: string) => Promise<void>;
  onMapReady: (map: mapboxgl.Map) => void;
}

// Create proper SVG pin marker
const createPinMarker = (color = '#dc2626') => {
  const markerEl = document.createElement('div');
  markerEl.className = 'custom-marker';
  markerEl.innerHTML = `
    <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.372 0 0 5.372 0 12C0 18.628 12 30 12 30S24 18.628 24 12C24 5.372 18.628 0 12 0Z" fill="${color}"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `;
  return markerEl;
};

export default function MapContainer({
  places,
  accessLevel,
  experienceId,
  isAddingPlace,
  newPlacePosition,
  setNewPlacePosition,
  updateNewMarker,
  onDeletePlace,
  onMapReady
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const newMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    setTimeout(() => {
      try {
        if (!mapContainer.current) return;
        
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/standard',
          center: [-90, 25],
          zoom: 2,
          projection: 'globe' as any,
          antialias: true,
          renderWorldCopies: false,
          maxZoom: 20,
          minZoom: 1
        });

        // Create ResizeObserver
        const resizeObserver = new ResizeObserver((entries) => {
          if (mapInstance) {
            setTimeout(() => {
              mapInstance.resize();
            }, 0);
          }
        });

        if (mapContainer.current) {
          resizeObserver.observe(mapContainer.current);
        }

        mapInstance.on('load', () => {
          // Set atmosphere styling
          mapInstance.setFog({
            color: 'rgba(140, 195, 255, 0.5)',
            'high-color': 'rgba(243, 181, 255, 0.4)',
            'horizon-blend': 0.03,
            'space-color': 'rgb(12, 12, 35)',
            'star-intensity': 0.6
          });

          // Add markers for each place
          places.forEach(place => {
            // Create proper pin marker
            const markerEl = createPinMarker('#dc2626');
            
            // Create popup following Mapbox demo pattern
            const popup = new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="place-info">
                  <h3>${place.name}</h3>
                  ${place.description ? `<p class="place-description">${place.description}</p>` : ''}
                  ${place.category ? `<p class="place-category">${place.category}</p>` : ''}
                  ${place.address ? `<p class="place-location">${place.address}</p>` : ''}
                  ${accessLevel === "admin" ? `
                    <button onclick="window.deletePlace('${place.id}')" class="delete-btn">
                      Delete Place
                    </button>
                  ` : ''}
                </div>
              `);
            
            // Add marker with popup using Mapbox demo pattern
            const marker = new mapboxgl.Marker({ 
              element: markerEl,
              anchor: 'bottom'
            })
              .setLngLat([place.longitude, place.latitude])
              .setPopup(popup)
              .addTo(mapInstance);

            markersRef.current.push(marker);
          });

          // Map click handler for adding places
          if (accessLevel === "admin") {
            mapInstance.on('click', (e) => {
              if (isAddingPlace) {
                const { lng, lat } = e.lngLat;
                setNewPlacePosition({ lng, lat });
                updateNewMarker(lng, lat);
              }
            });
          }

          // Remove unnecessary layers
          ['land-structure-line', 'waterway-label', 'natural-point-label', 
           'water-point-label', 'water-line-label'].forEach(layer => {
            if (mapInstance.getLayer(layer)) {
              mapInstance.removeLayer(layer);
            }
          });
          
          // Add custom layer for country borders
          mapInstance.addSource('country-boundaries', {
            type: 'vector',
            url: 'mapbox://mapbox.country-boundaries-v1'
          });

          mapInstance.addLayer({
            id: 'country-boundaries',
            type: 'line',
            source: 'country-boundaries',
            'source-layer': 'country_boundaries',
            paint: {
              'line-color': 'rgba(255, 182, 193, 0.3)',
              'line-width': 0.4,
              'line-opacity': 0.4
            }
          });

          // Adjust terrain and atmosphere
          mapInstance.setLight({
            intensity: 0.15,
            color: 'rgb(215, 205, 245)',
            anchor: 'map'
          });

          mapInstance.resize();
        });

        map.current = mapInstance;
        onMapReady(mapInstance);

        // Add global delete function
        window.deletePlace = onDeletePlace;

        const handleResize = () => {
          if (map.current) {
            map.current.resize();
          }
        };

        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          resizeObserver.disconnect();
          markersRef.current.forEach((marker: mapboxgl.Marker) => marker.remove());
          if (newMarkerRef.current) {
            newMarkerRef.current.remove();
          }
          if (map.current) {
            map.current.remove();
          }
        };
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 100);
  }, [places, isAddingPlace, accessLevel, experienceId, setNewPlacePosition, updateNewMarker, onDeletePlace, onMapReady]);

  // Update new marker when position changes
  useEffect(() => {
    if (newPlacePosition && map.current) {
      updateNewMarker(newPlacePosition.lng, newPlacePosition.lat);
    }
  }, [newPlacePosition, updateNewMarker]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: mapStyles }} />
      
      <div 
        ref={mapContainer} 
        style={{ 
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgb(12, 12, 35)'
        }} 
      />
    </>
  );
} 