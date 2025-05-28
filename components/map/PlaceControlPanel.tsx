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
  const [isAddingPlaceLoading, setIsAddingPlaceLoading] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const [showPositionError, setShowPositionError] = useState(false);

  const handleAddressGeocode = async () => {
    if (!newPlaceAddress.trim() || !map) return;
    
    setIsGeocoding(true);
    const result = await geocodeAddress(newPlaceAddress);
    setIsGeocoding(false);
    
    if (result) {
      setNewPlacePosition({ lng: result.lng, lat: result.lat });
      setNewPlaceAddress(result.fullAddress);
      
      // Update map view and marker
      map.flyTo({ center: [result.lng, result.lat], zoom: 6 });
      updateNewMarker(result.lng, result.lat);
    } else {
      alert('Could not find that address. Please try a different address or click on the map.');
    }
  };

  const handleAddPlace = async () => {
    if (!newPlacePosition || !newPlaceName.trim()) {
      if (!newPlaceName.trim()) {
        setShowNameError(true);
      }
      if (!newPlacePosition) {
        setShowPositionError(true);
      }
      return;
    }

    setShowNameError(false);
    setShowPositionError(false);
    setIsAddingPlaceLoading(true);

    const newPlace = {
      name: newPlaceName,
      description: newPlaceDescription || null,
      latitude: newPlacePosition.lat,
      longitude: newPlacePosition.lng,
      address: newPlaceAddress || null,
      category: newPlaceCategory || null,
    };

    try {
      const response = await fetch(`/api/experiences/${experienceId}/places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPlace),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add place: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      // Reset form
      resetForm();
      
      // Refresh the page to show the new place
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error adding place: ${errorMessage}`);
      setIsAddingPlaceLoading(false);
    }
  };

  const resetForm = () => {
    setNewPlaceName("");
    setNewPlaceDescription("");
    setNewPlaceCategory("");
    setNewPlaceAddress("");
    setNewPlacePosition(null);
    setIsAddingPlace(false);
    setIsAddingPlaceLoading(false);
    setShowNameError(false);
    setShowPositionError(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: controlPanelStyles }} />
      
      <div className="places-controls">
        <button 
          className={`control-button ${isAddingPlace ? 'active' : ''}`}
          onClick={() => setIsAddingPlace(!isAddingPlace)}
        >
          {isAddingPlace ? '✕ Cancel' : '+ Add Place'}
        </button>

        {isAddingPlace && (
          <>
           
            
            <input
              type="text"
              placeholder="Place name *"
              value={newPlaceName}
              onChange={(e) => {
                setNewPlaceName(e.target.value);
                if (showNameError && e.target.value.trim()) {
                  setShowNameError(false);
                }
              }}
              className="control-input"
              style={{
                borderColor: showNameError ? '#dc2626' : undefined,
                borderWidth: showNameError ? '2px' : undefined
              }}
            />
            
            {showNameError && (
              <div style={{ 
                fontSize: '11px', 
                color: '#dc2626', 
                marginTop: '-4px', 
                marginBottom: '8px',
                fontWeight: '600',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                padding: '6px 8px'
              }}>
                ⚠️ Place name is required
              </div>
            )}
            
            <input
              type="text"
              placeholder="Description"
              value={newPlaceDescription}
              onChange={(e) => setNewPlaceDescription(e.target.value)}
              className="control-input"
            />
            
            <input
              type="text"
              placeholder="Category"
              value={newPlaceCategory}
              onChange={(e) => setNewPlaceCategory(e.target.value)}
              className="control-input"
            />
            
            <input
              type="text"
              placeholder="Address"
              value={newPlaceAddress}
              onChange={(e) => setNewPlaceAddress(e.target.value)}
              className="control-input"
            />
            
            <button
              onClick={handleAddressGeocode}
              disabled={!newPlaceAddress.trim() || isGeocoding}
              className="control-button"
              style={{ fontSize: '11px', marginBottom: '8px' }}
            >
              {isGeocoding ? 'Searching...' : 'Find Address'}
            </button>
            
            {!newPlacePosition && showPositionError && (
              <div style={{ 
                fontSize: '11px', 
                color: '#dc2626', 
                marginBottom: '8px',
                fontWeight: '600',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                padding: '6px 8px'
              }}>
                ⚠️ Click on the map or use "Find Address" to set location
              </div>
            )}

            {newPlacePosition && (
              <div className="control-status">
                ✓ Position: {newPlacePosition.lat.toFixed(4)}, {newPlacePosition.lng.toFixed(4)}
              </div>
            )}

            <div className="control-actions">
              <button 
                onClick={handleAddPlace} 
                disabled={isAddingPlaceLoading}
                className="control-button"
                style={{ 
                  background: '#10b981 !important', 
                  color: 'white !important', 
                  width: '100%',
                  marginBottom: 0,
                  fontWeight: '600',
                  fontSize: '13px',
                  opacity: isAddingPlaceLoading ? '0.7' : '1'
                }}
              >
                {isAddingPlaceLoading ? '⏳ Adding...' : '✓ Add'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
} 