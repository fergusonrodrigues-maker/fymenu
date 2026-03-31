"use client";

import { useKitchenAlertContext } from "@/lib/context/KitchenAlertContext";
import { Volume2, VolumeX } from "lucide-react";

export function AudioControlButton() {
  const { isMuted, toggleMute, volume, setVolume, playTick } =
    useKitchenAlertContext();

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
      {/* Botão Mute/Unmute */}
      <button
        onClick={() => {
          toggleMute();
          if (isMuted) playTick(); // Feedback sonoro ao ativar
        }}
        className={`p-2 rounded transition ${
          isMuted
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
        title={isMuted ? "Ativar som" : "Mutar som"}
      >
        {isMuted ? (
          <VolumeX size={20} />
        ) : (
          <Volume2 size={20} />
        )}
      </button>

      {/* Volume Slider */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        disabled={isMuted}
        className="flex-1 cursor-pointer"
      />

      {/* Volume Percentage */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-12">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
