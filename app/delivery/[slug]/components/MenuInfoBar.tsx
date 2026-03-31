"use client";

import { MapPin, Clock, Phone } from "lucide-react";

interface MenuInfoBarProps {
  restaurant: {
    name: string;
    address?: string;
    phone_number?: string;
    opening_hours?: string;
    logo_url?: string;
  };
}

export function MenuInfoBar({ restaurant }: MenuInfoBarProps) {
  return (
    <div className="bg-gradient-to-r from-gray-900 to-black border-b border-gray-700 p-4">
      <div className="flex items-center gap-4">
        {/* Logo */}
        {restaurant.logo_url && (
          <img
            src={restaurant.logo_url}
            alt={restaurant.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        )}

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{restaurant.name}</h1>
          <div className="flex gap-4 text-xs text-gray-400 mt-1">
            {restaurant.address && (
              <div className="flex items-center gap-1">
                <MapPin size={12} />
                <span>{restaurant.address}</span>
              </div>
            )}
            {restaurant.opening_hours && (
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{restaurant.opening_hours}</span>
              </div>
            )}
          </div>
        </div>

        {/* Call to Action */}
        {restaurant.phone_number && (
          <a
            href={`tel:${restaurant.phone_number}`}
            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-semibold"
          >
            <Phone size={12} className="inline mr-1" />
            Ligar
          </a>
        )}
      </div>
    </div>
  );
}
