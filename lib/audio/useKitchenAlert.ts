import { useEffect, useRef } from "react";

interface UseKitchenAlertOptions {
  enabled?: boolean;
  volume?: number; // 0-1
}

export function useKitchenAlert({
  enabled = true,
  volume = 0.7,
}: UseKitchenAlertOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Inicializar AudioContext (necessário para Web Audio no navegador)
  const initAudioContext = () => {
    if (audioContextRef.current) return;
    try {
      const audioContext =
        new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
    } catch (error) {
      console.error("AudioContext initialization failed:", error);
    }
  };

  // Tocar bip simples
  const playBeep = (frequency = 800, duration = 500) => {
    if (!enabled) return;

    initAudioContext();
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration / 1000
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error("Audio playback error:", error);
    }
  };

  // Tocar alarme (3 bips em sequência)
  const playAlert = () => {
    playBeep(800, 300);
    setTimeout(() => playBeep(1000, 300), 350);
    setTimeout(() => playBeep(800, 300), 700);
  };

  // Tocar bip curto (para UI feedback)
  const playTick = () => {
    playBeep(600, 100);
  };

  return {
    playAlert,
    playBeep,
    playTick,
  };
}
