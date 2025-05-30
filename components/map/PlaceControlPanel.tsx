"use client";

import { useState } from 'react';
import type { NewPlacePosition } from './types';
import { geocodeAddress } from './utils';
import { controlPanelStyles } from './styles';

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

/**
 * Uploads image from client-side (triggered on map click for new places)
 * This bypasses server-side Mapbox fetching issues entirely
 */
async function uploadImageFromClient(staticImageUrl: string, experienceId: string): Promise<string | null> {
  console.log(`🌐 === CLIENT IMAGE UPLOAD START ===`);
  console.log(`🔗 Fetching image: ${staticImageUrl}`);
  
  try {
    // Fetch image from Mapbox
    const imageResponse = await fetch(staticImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBlob = await imageResponse.blob();
    console.log(`📸 Image fetched: ${imageBlob.size} bytes`);
    
    // Upload to Whop via our API
    const uploadResponse = await fetch(`/api/experiences/${experienceId}/upload-image`, {
      method: 'POST',
      body: imageBlob,
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log(`✅ Upload successful!`);
    console.log(`📎 DirectUploadId: ${uploadResult.directUploadId}`);
    
    // Store attachment ID globally for forum post creation
    (window as any).lastUploadedAttachmentId = uploadResult.directUploadId;
    
    return uploadResult.directUploadId;
    
  } catch (error) {
    console.error(`❌ Client image upload failed:`, error);
    return null;
  }
}

/**
 * CLIENT-SIDE: Create forum post with Whop API
 * This bypasses server-side timeout issues entirely
 */
async function createForumPostFromClient(
  experienceId: string,
  placeName: string,
  placeDescription: string | undefined,
  address: string | undefined,
  category: string | undefined,
  attachmentId: string
): Promise<boolean> {
  console.log(`🌐 === CLIENT-SIDE FORUM POST CREATION START ===`);
  console.log(`📍 Place: ${placeName}`);
  console.log(`📎 Attachment: ${attachmentId}`);
  
  try {
    // Step 1: Create forum post via new API endpoint
    const forumStart = Date.now();
    console.log(`📤 Step 1: Creating forum post via client API...`);
    
    const forumResponse = await fetch(`/api/experiences/${experienceId}/create-forum-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        placeName,
        placeDescription,
        address,
        category,
        attachmentId,
      }),
    });

    const forumDuration = Date.now() - forumStart;
    console.log(`📊 Forum post API response: ${forumResponse.status}`);

    if (!forumResponse.ok) {
      const errorText = await forumResponse.text();
      console.error(`❌ Forum post creation failed: ${forumResponse.status} - ${errorText}`);
      return false;
    }

    const forumResult = await forumResponse.json();
    console.log(`✅ Step 1 completed in ${forumDuration}ms - Forum post created!`);
    console.log(`📝 Post ID: ${forumResult.postId}`);
    console.log(`🎯 === CLIENT-SIDE FORUM POST COMPLETE ===`);
    
    return true;

  } catch (error) {
    console.error(`❌ Client-side forum post creation failed:`, error);
    return false;
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

  /**
   * Submits new place to the API and creates forum post
   * All operations now happen client-side to avoid Vercel timeouts
   */
  const handleAddPlace = async () => {
    if (!newPlacePosition || !newPlaceName.trim()) return;

    const newPlace = {
      name: newPlaceName,
      description: newPlaceDescription || null,
      latitude: newPlacePosition.lat,
      longitude: newPlacePosition.lng,
      address: newPlaceAddress || null,
      category: newPlaceCategory || null,
    };

    try {
      console.log(`🔄 Starting complete place creation flow: ${newPlaceName}`);
      
      // Step 1: Upload image first to get attachment ID
      let attachmentId: string | null = null;
      
      console.log(`📸 Step 1: Attempting image upload...`);
      const imageStart = Date.now();
      
      const staticImageUrl = getMapboxStaticImageUrl(
        newPlacePosition.lat, 
        newPlacePosition.lng
      );
      
      if (staticImageUrl) {
        try {
          console.log(`🗺️ Generated Mapbox URL: ${staticImageUrl}`);
          attachmentId = await uploadImageFromClient(staticImageUrl, experienceId);
          const imageDuration = Date.now() - imageStart;
          
          if (attachmentId) {
            console.log(`✅ Step 1 completed in ${imageDuration}ms - Image uploaded: ${attachmentId}`);
            // Store globally for forum post creation
            (window as any).lastUploadedAttachmentId = attachmentId;
          } else {
            console.log(`⚠️ Step 1 completed in ${imageDuration}ms - Image upload returned null`);
          }
        } catch (error) {
          const imageDuration = Date.now() - imageStart;
          console.error(`❌ Step 1 failed in ${imageDuration}ms - Image upload error:`, error);
        }
      } else {
        console.log(`⚠️ Step 1 skipped - No Mapbox token or URL generation failed`);
      }

      // Step 2: Create the place (no forum post on server side)
      console.log(`🏗️ Step 2: Creating place record...`);
      const placeStart = Date.now();
      
      const response = await fetch(`/api/experiences/${experienceId}/places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newPlace,
          skipForumPost: true, // Tell server to skip forum post creation
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add place");
      }

      const createdPlace = await response.json();
      const placeDuration = Date.now() - placeStart;
      console.log(`✅ Step 2 completed in ${placeDuration}ms - Place created: ${createdPlace.id}`);

      // Step 3: Create forum post (client-side)
      let forumSuccess = false;
      
      if (attachmentId) {
        console.log(`📤 Step 3: Creating forum post with attachment...`);
        const forumStart = Date.now();
        
        forumSuccess = await createForumPostFromClient(
          experienceId,
          newPlaceName,
          newPlaceDescription || undefined,
          newPlaceAddress || undefined,
          newPlaceCategory || undefined,
          attachmentId
        );
        
        const forumDuration = Date.now() - forumStart;
        console.log(`${forumSuccess ? '✅' : '❌'} Step 3 completed in ${forumDuration}ms`);
      } else {
        console.warn(`⚠️ Step 3 skipped - No attachment ID available`);
      }

      if (forumSuccess) {
        console.log(`🎉 Complete flow successful: Place + Forum post created!`);
      } else {
        console.log(`✅ Place created successfully (forum post skipped)`);
      }

      // Reset form and refresh page to show new place
      resetForm();
      window.location.reload();
    } catch (error) {
      console.error("Error in complete place creation flow:", error);
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