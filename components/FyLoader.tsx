"use client";

import FyPulseLoader from "./FyPulseLoader";

/**
 * FyLoader — delegates to FyPulseLoader.
 * Kept for backwards compatibility with all existing imports.
 */
export default function FyLoader({
  size = "md",
  text,
}: {
  size?: "sm" | "md" | "lg";
  text?: string;
}) {
  return <FyPulseLoader size={size} text={text} />;
}
