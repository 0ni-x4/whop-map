"use client";

import { useState, useEffect } from 'react';
import type { NewPlacePosition, Place } from './types';
import { geocodeAddress } from './utils';
import { controlPanelStyles } from './styles';

interface PlaceControlPanelProps {
  experienceId: string;
  accessLevel: "admin" | "customer" | "no_access";
  isAddingPlace: boolean;
  setIsAddingPlace: (value: boolean) => void;
  newPlacePosition: NewPlacePosition | null;
  setNewPlacePosition: (position: NewPlacePosition | null) => void;
  updateNewMarker: (lng: number, lat: number) => void;
  map: any;
}

/**
 * Generate Mapbox Static Image URL with high quality and no watermark
 */
function getMapboxStaticImageUrl(lat: number, lng: number): string | null {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.warn("No Mapbox token configured");
    return null;
  }

  try {
    // HIGH QUALITY: Larger size, better zoom, retina quality, no logo
    const staticImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
      `pin-l-marker+dc2626(${lng},${lat})/` + // Large pin marker (pin-l instead of pin-s)
      `${lng},${lat},14,0/` + // Higher zoom level (14 instead of 12) for more detail
      `600x400@2x?` + // Larger size (600x400) with retina quality (@2x)
      `logo=false&` + // Remove Mapbox logo/watermark
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
    console.log(`📄 Upload result:`, uploadResult);
    console.log(`📎 AttachmentId: ${uploadResult.attachmentId}`);
    
    // Store attachment ID globally for forum post creation
    if (uploadResult.attachmentId) {
      (window as any).lastUploadedAttachmentId = uploadResult.attachmentId;
      return uploadResult.attachmentId;
    } else {
      console.error(`❌ No attachmentId in response:`, uploadResult);
      return null;
    }
    
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
  accessLevel,
  isAddingPlace,
  setIsAddingPlace,
  newPlacePosition,
  setNewPlacePosition,
  updateNewMarker,
  map
}: PlaceControlPanelProps) {
  // Form state
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceDescription, setNewPlaceDescription] = useState("");
  const [newPlaceCategory, setNewPlaceCategory] = useState("");
  const [newPlaceAddress, setNewPlaceAddress] = useState("");
  
  // Loading states
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isCreatingPlace, setIsCreatingPlace] = useState(false);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  
  // Places list state
  const [showPlacesList, setShowPlacesList] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoaded, setPlacesLoaded] = useState(false);
  
  // Current operation state for better UX
  const [currentOperation, setCurrentOperation] = useState<string>("");

  // Preload places when component mounts
  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    if (placesLoaded) return; // Don't fetch if already loaded
    
    setIsLoadingPlaces(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/experiences/${experienceId}/places`);
      if (!response.ok) {
        throw new Error('Failed to fetch places');
      }
      const fetchedPlaces = await response.json();
      setPlaces(fetchedPlaces);
      setPlacesLoaded(true);
    } catch (err) {
      setError('Failed to load places');
      console.error('Error fetching places:', err);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const handleAddressGeocode = async () => {
    if (!newPlaceAddress.trim() || !map) return;
    
    setIsGeocoding(true);
    setGeocodingError(null);
    setCurrentOperation("Finding address...");
    
    try {
      const result = await geocodeAddress(newPlaceAddress);
      
      if (result) {
        setNewPlacePosition({ lng: result.lng, lat: result.lat });
        setNewPlaceAddress(result.fullAddress);
        
        // Fly to the geocoded location and show preview marker
        map.flyTo({ center: [result.lng, result.lat], zoom: 6 });
        updateNewMarker(result.lng, result.lat);
        setCurrentOperation("Address found!");
        
        // Clear success message after 2 seconds
        setTimeout(() => setCurrentOperation(""), 2000);
      } else {
        setGeocodingError('Could not find that address. Please try a different address or click on the map.');
      }
    } catch (err) {
      setGeocodingError('Error searching for address. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

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

    setIsCreatingPlace(true);
    setError(null);
    setCurrentOperation("Creating place...");

    try {
      console.log(`🔄 Starting complete place creation flow: ${newPlaceName}`);
      
      // Step 1: Upload image first to get attachment ID
      let attachmentId: string | null = null;
      
      console.log(`📸 Step 1: Attempting image upload...`);
      setCurrentOperation("Uploading image...");
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
            (window as any).lastUploadedAttachmentId = attachmentId;
            setCurrentOperation("Image uploaded!");
          } else {
            console.log(`⚠️ Step 1 completed in ${imageDuration}ms - Image upload returned null`);
            setCurrentOperation("Image upload failed, continuing...");
          }
        } catch (error) {
          const imageDuration = Date.now() - imageStart;
          console.error(`❌ Step 1 failed in ${imageDuration}ms - Image upload error:`, error);
          setCurrentOperation("Image upload failed, continuing...");
        }
      } else {
        console.log(`⚠️ Step 1 skipped - No Mapbox token or URL generation failed`);
        setCurrentOperation("No image token, continuing...");
      }

      // Step 2: Create the place (no forum post on server side)
      console.log(`🏗️ Step 2: Creating place record...`);
      setCurrentOperation("Saving place...");
      const placeStart = Date.now();
      
      const response = await fetch(`/api/experiences/${experienceId}/places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newPlace,
          skipForumPost: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add place");
      }

      const createdPlace = await response.json();
      const placeDuration = Date.now() - placeStart;
      console.log(`✅ Step 2 completed in ${placeDuration}ms - Place created: ${createdPlace.id}`);
      setCurrentOperation("Place created!");

      // Step 3: Create forum post (client-side)
      let forumSuccess = false;
      
      if (attachmentId) {
        console.log(`📤 Step 3: Creating forum post with attachment...`);
        setCurrentOperation("Creating forum post...");
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
        setCurrentOperation(forumSuccess ? "Forum post created!" : "Forum post failed");
      } else {
        console.warn(`⚠️ Step 3 skipped - No attachment ID available`);
        setCurrentOperation("Forum post skipped");
      }

      if (forumSuccess) {
        console.log(`🎉 Complete flow successful: Place + Forum post created!`);
        setCurrentOperation("🎉 Success! Place and forum post created!");
      } else {
        console.log(`✅ Place created successfully (forum post skipped)`);
        setCurrentOperation("✅ Place created successfully!");
      }

      // Update places list with new place and reset form
      setPlaces(prev => [createdPlace, ...prev]);
      
      // Reset form and refresh after 2 seconds
      setTimeout(() => {
        resetForm();
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Error in complete place creation flow:", error);
      setError("Failed to create place. Please try again.");
      setCurrentOperation("");
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
    setError(null);
    setGeocodingError(null);
    setCurrentOperation("");
  };

  const togglePlacesList = () => {
    // Close add place mode when opening places list
    if (!showPlacesList && isAddingPlace) {
      setIsAddingPlace(false);
      resetForm();
    }
    
    setShowPlacesList(!showPlacesList);
  };

  const toggleAddPlace = () => {
    // Close places list when opening add place mode
    if (!isAddingPlace && showPlacesList) {
      setShowPlacesList(false);
    }
    
    setIsAddingPlace(!isAddingPlace);
  };

  const navigateToPlace = (place: Place) => {
    if (map) {
      map.flyTo({
        center: [place.longitude, place.latitude],
        zoom: 15,
        duration: 2000 // Smooth 2-second animation
      });
      setShowPlacesList(false); // Close the list after navigation
    }
  };

  const getCurrentStatus = () => {
    if (currentOperation) return currentOperation;
    if (error) return error;
    if (geocodingError) return geocodingError;
    if (newPlacePosition) return `✓ Position: ${newPlacePosition.lat.toFixed(4)}, ${newPlacePosition.lng.toFixed(4)}`;
    return null;
  };

  const getStatusColor = () => {
    if (error || geocodingError) return '#dc2626'; // Red for errors
    if (currentOperation.includes('Success') || currentOperation.includes('✅') || currentOperation.includes('🎉')) return '#10b981'; // Green for success
    if (currentOperation.includes('found') || currentOperation.includes('created') || currentOperation.includes('uploaded')) return '#10b981'; // Green for success
    if (newPlacePosition && !currentOperation) return '#10b981'; // Green for position set
    return '#6b7280'; // Gray for neutral states
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: controlPanelStyles }} />
      
      <div className={`places-controls ${showPlacesList ? 'expanded' : ''}`}>
        {/* Places List Section (shows when expanded) */}
        {showPlacesList && (
          <div className="places-list-section">
            <div className="places-list-header">
              <h3>Places ({places.length})</h3>
            </div>
            
            {isLoadingPlaces ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Loading places...</span>
              </div>
            ) : places.length === 0 ? (
              <div className="empty-state">
                <span>No places added yet</span>
              </div>
            ) : (
              <div className="places-list">
                {places.map((place) => (
                  <div
                    key={place.id}
                    className="place-item"
                    onClick={() => navigateToPlace(place)}
                  >
                    <div className="place-item-main">
                      <span className="place-name">{place.name}</span>
                      {place.category && (
                        <span className="place-category">{place.category}</span>
                      )}
                    </div>
                    {place.address && (
                      <div className="place-address">{place.address}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Controls Section */}
        <div className="main-controls">
          {/* Primary Actions */}
          <div className="primary-actions">
            <button 
              className="control-button primary"
              onClick={togglePlacesList}
              disabled={isCreatingPlace}
            >
              📍 View Places ({places.length})
            </button>
            
            {/* Add Place button - only for admin users */}
            {accessLevel === "admin" && (
              <button 
                className={`control-button ${isAddingPlace ? 'active' : 'primary'}`}
                onClick={toggleAddPlace}
                disabled={isCreatingPlace}
              >
                {isCreatingPlace ? '⏳ Creating...' : isAddingPlace ? '✕ Cancel' : '+ Add Place'}
              </button>
            )}
          </div>

          {/* Add Place Form (shows when adding) - only for admin users */}
          {isAddingPlace && accessLevel === "admin" && (
            <div className="add-place-form">
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
                className="control-button secondary"
              >
                {isGeocoding ? '🔍 Searching...' : '🔍 Find Address'}
              </button>
              
              {/* Status Display */}
              {getCurrentStatus() && (
                <div 
                  className="status-display"
                  style={{ color: getStatusColor() }}
                >
                  {getCurrentStatus()}
                </div>
              )}

              {/* Action Buttons - only show when position is set */}
              {newPlacePosition && !error && !geocodingError && (
                <div className="form-actions">
                  <button 
                    onClick={handleAddPlace} 
                    disabled={!newPlaceName.trim() || isCreatingPlace}
                    className="control-button success"
                  >
                    {isCreatingPlace ? '⏳ Creating...' : '✓ Create Place'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 