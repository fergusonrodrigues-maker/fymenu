"use client";

import { useState } from "react";
import { useProductAvailability } from "@/lib/hooks/useProductAvailability";

interface AvailabilitySchedulerProps {
  productId: string;
}

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function AvailabilityScheduler({ productId }: AvailabilitySchedulerProps) {
  const { availability, addTimeWindow, removeTimeWindow } = useProductAvailability(productId);
  const [selectedDay, setSelectedDay] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("22:00");

  const handleAddWindow = async () => {
    await addTimeWindow(selectedDay, startTime, endTime);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Disponibilidade Horária</h3>

      <div className="space-y-2">
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(parseInt(e.target.value))}
          className="w-full p-2 border rounded"
        >
          {DAYS.map((day, idx) => (
            <option key={idx} value={idx}>
              {day}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleAddWindow}
            className="px-3 py-2 bg-blue-500 text-white rounded"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {availability.map((window, idx) => (
          <div key={idx} className="p-2 bg-gray-100 rounded flex justify-between">
            <span className="text-sm">
              {DAYS[window.day]} {window.startTime} - {window.endTime}
            </span>
            <button
              onClick={() => removeTimeWindow(idx)}
              className="text-red-500 text-sm"
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
