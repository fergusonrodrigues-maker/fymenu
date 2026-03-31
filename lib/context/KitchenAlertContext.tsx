"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useKitchenAlert } from "@/lib/audio/useKitchenAlert";

interface KitchenAlertContextType {
  playAlert: () => void;
  playTick: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  volume: number;
  setVolume: (vol: number) => void;
}

const KitchenAlertContext = createContext<KitchenAlertContextType | null>(null);

export function KitchenAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(0.7);

  const { playAlert: playAlertSound, playTick: playTickSound } =
    useKitchenAlert({
      enabled: !isMuted,
      volume,
    });

  const playAlert = useCallback(() => {
    playAlertSound();
  }, [playAlertSound]);

  const playTick = useCallback(() => {
    playTickSound();
  }, [playTickSound]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  const value: KitchenAlertContextType = {
    playAlert,
    playTick,
    toggleMute,
    isMuted,
    volume,
    setVolume,
  };

  return (
    <KitchenAlertContext.Provider value={value}>
      {children}
    </KitchenAlertContext.Provider>
  );
}

export function useKitchenAlertContext() {
  const context = useContext(KitchenAlertContext);
  if (!context) {
    throw new Error(
      "useKitchenAlertContext must be used within KitchenAlertProvider"
    );
  }
  return context;
}
