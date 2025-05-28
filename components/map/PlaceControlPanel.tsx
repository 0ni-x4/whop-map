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

      // Reset form
      resetForm();
      
      // Refresh the page to show the new place
      window.location.reload();
    } catch (error) {
      console.error("Error adding place:", error);
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
        >
          {isAddingPlace ? '✕ Cancel' : '+ Add Place'}
        </button>

        {isAddingPlace && (
          <>
           
            
            <input
              type="text"
              placeholder="Place name *"
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              className="control-input"
            />
            
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
            
            {newPlacePosition && (
              <div className="control-status">
                ✓ Position: {newPlacePosition.lat.toFixed(4)}, {newPlacePosition.lng.toFixed(4)}
              </div>
            )}

            {newPlacePosition && (
              <div className="control-actions">
                <button 
                  onClick={handleAddPlace} 
                  disabled={!newPlaceName.trim()}
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
                  ✓ Add
                </button>
                <button
                  onClick={resetForm}
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