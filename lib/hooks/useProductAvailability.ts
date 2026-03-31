import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface AvailabilityWindow {
  day: number; // 0-6 (seg-dom)
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  enabled: boolean;
}

export function useProductAvailability(productId?: string) {
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchAvailability = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from("products")
          .select("availability")
          .eq("id", id)
          .single();

        if (err) throw err;
        setAvailability(data?.availability || []);
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateAvailability = useCallback(
    async (windows: AvailabilityWindow[]) => {
      if (!productId) return false;

      try {
        const { error: err } = await supabase
          .from("products")
          .update({ availability: windows })
          .eq("id", productId);

        if (err) throw err;
        setAvailability(windows);
        return true;
      } catch (error) {
        console.error("Error updating availability:", error);
        return false;
      }
    },
    [productId, supabase]
  );

  const addTimeWindow = useCallback(
    async (day: number, startTime: string, endTime: string) => {
      const newWindow: AvailabilityWindow = {
        day,
        startTime,
        endTime,
        enabled: true,
      };
      const updated = [...availability, newWindow];
      return updateAvailability(updated);
    },
    [availability, updateAvailability]
  );

  const removeTimeWindow = useCallback(
    async (index: number) => {
      const updated = availability.filter((_, i) => i !== index);
      return updateAvailability(updated);
    },
    [availability, updateAvailability]
  );

  return {
    availability,
    loading,
    fetchAvailability,
    updateAvailability,
    addTimeWindow,
    removeTimeWindow,
  };
}
