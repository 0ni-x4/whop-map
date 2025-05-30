"use client";

import { useState } from 'react';
import type { NewPlacePosition } from './types';
import { geocodeAddress } from './utils';
import { controlPanelStyles } from './styles';
import { uploadImageFromClient } from './MapContainer';

interface PlaceControlPanelProps {
  experienceId: string;
  isAddingPlace: boolean;
  setIsAddingPlace: (value: boolean) => void;
  newPlacePosition: NewPlacePosition | null;
  setNewPlacePosition: (position: NewPlacePosition | null) => void;
  updateNewMarker: (lng: number, lat: number) => void;
  map: any;
}

/**
 * Generate Mapbox Static Image URL
 */
function getMapboxStaticImageUrl(lat: number, lng: number): string | null {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn("No Mapbox token configured");
    return null;
  }

  try {
    // OPTIMIZATION: Smaller image size for faster loading
    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
      `pin-s-marker+dc2626(${lng},${lat})/` + // Red pin marker
      `${lng},${lat},12,0/` + // Lower zoom for faster loading
      `300x200?` + // Smaller size
      `access_token=${mapboxToken}`;

    return staticImageUrl;
  } catch (error) {
    console.error("Error generating Mapbox Static image URL:", error);
    return null;
  }
}

export default function PlaceControlPanel({
  experienceId,
  isAddingPlace,
  setIsAddingPlace,
  newPlacePosition,
  setNewPlacePosition,
  updateNewMarker,
  map
}: PlaceControlPanelProps) {
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceDescription, setNewPlaceDescription] = useState("");
  const [newPlaceCategory, setNewPlaceCategory] = useState("");
  const [newPlaceAddress, setNewPlaceAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isCreatingPlace, setIsCreatingPlace] = useState(false);

  const handleAddressGeocode = async () => {
    if (!newPlaceAddress.trim() || !map) return;
    
    setIsGeocoding(true);
    const result = await geocodeAddress(newPlaceAddress);
    setIsGeocoding(false);
    
    if (result) {
      setNewPlacePosition({ lng: result.lng, lat: result.lat });
      setNewPlaceAddress(result.fullAddress);
      
      // Fly to the geocoded location and show preview marker
      map.flyTo({ center: [result.lng, result.lat], zoom: 6 });
      updateNewMarker(result.lng, result.lat);
    } else {
      alert('Could not find that address. Please try a different address or click on the map.');
    }
  };

  const handleAddPlace = async () => {
    if (!newPlacePosition || !newPlaceName.trim()) return;

    setIsCreatingPlace(true);
    console.log(`🚀 === CLIENT-SIDE PLACE CREATION START ===`);
    
    try {
      // Step 1: Try to upload image from client first (optional)
      let attachmentId: string | null = null;
      
      console.log(`📸 Step 1: Attempting client-side image upload...`);
      const imageStart = Date.now();
      
      const staticImageUrl = getMapboxStaticImageUrl(
        newPlacePosition.lat, 
        newPlacePosition.lng
      );
      
      if (staticImageUrl) {
        try {
          attachmentId = await uploadImageFromClient(staticImageUrl, experienceId);
          const imageDuration = Date.now() - imageStart;
          
          if (attachmentId) {
            console.log(`✅ Step 1 completed in ${imageDuration}ms - Image uploaded: ${attachmentId}`);
          } else {
            console.log(`⚠️ Step 1 completed in ${imageDuration}ms - Image upload failed, proceeding without image`);
          }
        } catch (error) {
          const imageDuration = Date.now() - imageStart;
          console.log(`⚠️ Step 1 failed in ${imageDuration}ms - Image upload error, proceeding without image:`, error);
        }
      } else {
        console.log(`⚠️ Step 1 skipped - No Mapbox token or URL generation failed`);
      }

      // Step 2: Create place with optional attachment ID
      console.log(`🏗️ Step 2: Creating place record...`);
      const placeStart = Date.now();

      const newPlace = {
        name: newPlaceName,
        description: newPlaceDescription || null,
        latitude: newPlacePosition.lat,
        longitude: newPlacePosition.lng,
        address: newPlaceAddress || null,
        category: newPlaceCategory || null,
        attachmentId: attachmentId, // Pass the pre-uploaded image
      };

      const response = await fetch(`/api/experiences/${experienceId}/places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPlace),
      });

      if (!response.ok) {
        throw new Error("Failed to add place");
      }

      const result = await response.json();
      const placeDuration = Date.now() - placeStart;
      console.log(`✅ Step 2 completed in ${placeDuration}ms - Place created: ${result.id}`);

      console.log(`🎯 === CLIENT-SIDE PLACE CREATION COMPLETE ===`);
      
      // Reset form and refresh page to show new place
      resetForm();
      window.location.reload();

    } catch (error) {
      console.error("❌ Error adding place:", error);
      alert("Failed to add place. Please try again.");
    } finally {
      setIsCreatingPlace(false);
    }
  };

  const resetForm = () => {
    setNewPlaceName("");
    setNewPlaceDescription("");
    setNewPlaceCategory("");
    setNewPlaceAddress("");
    setNewPlacePosition(null);
    setIsAddingPlace(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: controlPanelStyles }} />
      
      <div className="places-controls">
        <button 
          className={`control-button ${isAddingPlace ? 'active' : ''}`}
          onClick={() => setIsAddingPlace(!isAddingPlace)}
          disabled={isCreatingPlace}
        >
          {isCreatingPlace ? 'Creating...' : isAddingPlace ? '✕ Cancel' : '+ Add Place'}
        </button>

        {isAddingPlace && (
          <>
            <input
              type="text"
              placeholder="Place name *"
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              className="control-input"
              disabled={isCreatingPlace}
            />
            
            <input
              type="text"
              placeholder="Description"
              value={newPlaceDescription}
              onChange={(e) => setNewPlaceDescription(e.target.value)}
              className="control-input"
              disabled={isCreatingPlace}
            />
            
            <input
              type="text"
              placeholder="Category"
              value={newPlaceCategory}
              onChange={(e) => setNewPlaceCategory(e.target.value)}
              className="control-input"
              disabled={isCreatingPlace}
            />
            
            <input
              type="text"
              placeholder="Address"
              value={newPlaceAddress}
              onChange={(e) => setNewPlaceAddress(e.target.value)}
              className="control-input"
              disabled={isCreatingPlace}
            />
            
            <button
              onClick={handleAddressGeocode}
              disabled={!newPlaceAddress.trim() || isGeocoding || isCreatingPlace}
              className="control-button"
              style={{ fontSize: '11px', marginBottom: '8px' }}
            >
              {isGeocoding ? 'Searching...' : 'Find Address'}
            </button>
            
            {newPlacePosition && (
              <div className="control-status">
                ✓ Position: {newPlacePosition.lat.toFixed(4)}, {newPlacePosition.lng.toFixed(4)}
              </div>
            )}

            {newPlacePosition && (
              <div className="control-actions">
                <button 
                  onClick={handleAddPlace} 
                  disabled={!newPlaceName.trim() || isCreatingPlace}
                  className="control-button"
                  style={{ 
                    background: '#10b981 !important', 
                    color: 'white !important', 
                    flex: '2', 
                    marginBottom: 0,
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  {isCreatingPlace ? '⏳ Creating...' : '✓ Add'}
                </button>
                <button
                  onClick={resetForm}
                  disabled={isCreatingPlace}
                  className="control-button"
                  style={{ 
                    background: '#dc2626 !important', 
                    color: 'white !important', 
                    flex: '1', 
                    padding: '8px', 
                    marginBottom: 0,
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
} 