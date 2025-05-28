"use client";

import { Button } from "@/components/ui/button";
import type { Place } from './types';

interface PlacesListProps {
  places: Place[];
  accessLevel: "admin" | "customer" | "no_access";
  onDeletePlace: (placeId: string) => Promise<void>;
}

export default function PlacesList({
  places,
  accessLevel,
  onDeletePlace
}: PlacesListProps) {
  return (
    <div className="w-full h-full flex flex-col bg-[rgb(12,12,35)] text-white">
      <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-2xl m-6 backdrop-blur-md">
        <h3 className="text-xl font-semibold text-red-200 mb-3">
          ⚠️ Mapbox Token Required
        </h3>
        <p className="text-red-300/80 mb-4 leading-relaxed">
          To enable the interactive globe, add your Mapbox token to your environment variables:
        </p>
        <code className="bg-red-950/50 text-red-200 p-3 rounded-lg block text-sm font-mono">
          NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
        </code>
        <p className="text-red-300/70 mt-3 text-sm">
          Get your free token at <a href="https://mapbox.com" className="underline text-red-200">mapbox.com</a>
        </p>
      </div>
      
      {/* Fallback list view */}
      <div className="flex-1 p-6">
        <h3 className="text-xl font-semibold mb-4 text-white">
          Places ({places.length})
        </h3>
        
        {places.length === 0 ? (
          <div className="text-gray-400 text-center py-12">
            {accessLevel === "admin" 
              ? "No places added yet. Add a Mapbox token to enable the interactive globe!"
              : "No places to display."
            }
          </div>
        ) : (
          <div className="space-y-4">
            {places.map((place) => (
              <div key={place.id} className="border border-white/10 rounded-xl p-5 bg-white/5 backdrop-blur-md">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-white mb-2">{place.name}</h4>
                    {place.description && (
                      <p className="text-gray-300 mb-2">{place.description}</p>
                    )}
                    {place.category && (
                      <span className="inline-block bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm mb-2">
                        {place.category}
                      </span>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      📍 {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                    </p>
                    {place.address && (
                      <p className="text-sm text-gray-400">
                        {place.address}
                      </p>
                    )}
                  </div>
                  {accessLevel === "admin" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeletePlace(place.id)}
                      className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 