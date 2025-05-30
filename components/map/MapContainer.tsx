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

/**
 * Creates a custom SVG pin marker
 * This is the same function as in MapView - consider extracting to utils
 */
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

/**
 * CLIENT-SIDE: Upload image directly from browser to Whop
 * This bypasses server-side network issues entirely
 */
export async function uploadImageFromClient(
  imageUrl: string, 
  experienceId: string
): Promise<string | null> {
  console.log(`🖥️ === CLIENT-SIDE IMAGE UPLOAD START ===`);
  console.log(`🔗 Full Image URL: ${imageUrl}`);
  console.log(`📍 Experience ID: ${experienceId}`);
  
  try {
    // Step 1: Fetch image from Mapbox (client-side)
    const fetchStart = Date.now();
    console.log(`📥 Step 1: Fetching image from client...`);
    console.log(`🌐 Fetch URL: ${imageUrl}`);
    
    const imageResponse = await fetch(imageUrl);
    console.log(`📊 Fetch response status: ${imageResponse.status}`);
    console.log(`📊 Fetch response headers:`, Object.fromEntries(imageResponse.headers.entries()));
    
    if (!imageResponse.ok) {
      console.error(`❌ Image fetch failed with status: ${imageResponse.status}`);
      console.error(`❌ Status text: ${imageResponse.statusText}`);
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const fetchDuration = Date.now() - fetchStart;
    console.log(`✅ Step 1 completed in ${fetchDuration}ms`);

    // Step 2: Convert to blob
    const blobStart = Date.now();
    console.log(`🔄 Step 2: Converting to blob...`);
    
    const imageBlob = await imageResponse.blob();
    const blobDuration = Date.now() - blobStart;
    console.log(`✅ Step 2 completed in ${blobDuration}ms`);
    console.log(`📊 Blob size: ${imageBlob.size} bytes`);
    console.log(`📊 Blob type: ${imageBlob.type}`);

    // Step 3: Upload via our API with the blob
    const uploadStart = Date.now();
    console.log(`⬆️ Step 3: Uploading via client API...`);
    console.log(`🎯 Upload URL: /api/experiences/${experienceId}/upload-image`);
    
    const uploadResponse = await fetch(`/api/experiences/${experienceId}/upload-image`, {
      method: 'POST',
      body: imageBlob,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });

    console.log(`📊 Upload response status: ${uploadResponse.status}`);
    console.log(`📊 Upload response headers:`, Object.fromEntries(uploadResponse.headers.entries()));

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`❌ Upload API failed with status: ${uploadResponse.status}`);
      console.error(`❌ Error response: ${errorText}`);
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const uploadDuration = Date.now() - uploadStart;
    const totalDuration = Date.now() - fetchStart;

    console.log(`📄 Upload API response:`, uploadResult);

    if (uploadResult.success && uploadResult.attachmentId) {
      console.log(`✅ Step 3 completed in ${uploadDuration}ms`);
      console.log(`🎯 === CLIENT-SIDE UPLOAD COMPLETE ===`);
      console.log(`⏱️ TOTAL TIME: ${totalDuration}ms`);
      console.log(`📎 Attachment ID: ${uploadResult.attachmentId}`);
      return uploadResult.attachmentId;
    } else {
      console.error(`❌ Upload result missing success or attachmentId:`, uploadResult);
      console.error(`❌ Success: ${uploadResult.success}, AttachmentId: ${uploadResult.attachmentId}`);
      return null;
    }

  } catch (error) {
    console.error(`❌ Client-side image upload failed:`, error);
    console.error(`❌ Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`❌ Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    return null;
  }
}

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

  useEffect(() => {
    // Prevent double initialization
    if (!mapContainer.current || map.current) return;

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Slight delay to ensure DOM is ready
    setTimeout(() => {
      try {
        if (!mapContainer.current) return;
        
        // Initialize Mapbox map with 3D globe projection
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/standard', // Clean, modern base style
          center: [-90, 25], // Center on North America
          zoom: 2, // Global view
          projection: 'globe' as any, // 3D globe projection
          antialias: true, // Smooth edges
          renderWorldCopies: false, // Don't repeat the world
          maxZoom: 20,
          minZoom: 1
        });

        // Handle window resizing
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
          // Configure 3D atmosphere effect
          mapInstance.setFog({
            color: 'rgba(140, 195, 255, 0.5)', // Sky blue atmosphere
            'high-color': 'rgba(243, 181, 255, 0.4)', // Purple highlights
            'horizon-blend': 0.03, // Smooth horizon transition
            'space-color': 'rgb(12, 12, 35)', // Dark space background
            'star-intensity': 0.6 // Subtle star field
          });

          // Add markers for each existing place
          places.forEach(place => {
            // Create red pin marker for existing places
            const markerEl = createPinMarker('#dc2626');
            
            // Create popup with place information
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
            
            // Create marker with popup
            const marker = new mapboxgl.Marker({ 
              element: markerEl,
              anchor: 'bottom' // Pin tip points to exact coordinates
            })
              .setLngLat([place.longitude, place.latitude])
              .setPopup(popup) // Attach popup to marker
              .addTo(mapInstance);

            markersRef.current.push(marker);
          });

          // Handle map clicks for adding new places (admin only)
          if (accessLevel === "admin") {
            mapInstance.on('click', (e) => {
              if (isAddingPlace) {
                const { lng, lat } = e.lngLat;
                setNewPlacePosition({ lng, lat });
                updateNewMarker(lng, lat);
              }
            });
          }

          // Remove unnecessary map layers for cleaner look
          ['land-structure-line', 'waterway-label', 'natural-point-label', 
           'water-point-label', 'water-line-label'].forEach(layer => {
            if (mapInstance.getLayer(layer)) {
              mapInstance.removeLayer(layer);
            }
          });
          
          // Add custom country boundaries
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
              'line-color': 'rgba(255, 182, 193, 0.3)', // Subtle pink borders
              'line-width': 0.4,
              'line-opacity': 0.4
            }
          });

          // Configure lighting for 3D effect
          mapInstance.setLight({
            intensity: 0.15, // Subtle lighting
            color: 'rgb(215, 205, 245)', // Soft purple light
            anchor: 'map' // Light follows map rotation
          });

          // Ensure map renders properly
          mapInstance.resize();
        });

        map.current = mapInstance;
        onMapReady(mapInstance);

        // Make delete function globally available for popup buttons
        (window as any).deletePlace = onDeletePlace;

        // Handle window resize events
        const handleResize = () => {
          if (map.current) {
            map.current.resize();
          }
        };

        window.addEventListener('resize', handleResize);
        
        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize);
          resizeObserver.disconnect();
          markersRef.current.forEach((marker: mapboxgl.Marker) => marker.remove());
          if (map.current) {
            map.current.remove();
          }
        };
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 100);
  }, [places, accessLevel, experienceId, isAddingPlace, setNewPlacePosition, updateNewMarker, onDeletePlace, onMapReady]);

  return (
    <>
      {/* Inject map styles */}
      <style dangerouslySetInnerHTML={{ __html: mapStyles }} />
      
      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ position: 'relative' }}
      />
    </>
  );
} 