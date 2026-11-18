"use client";

import { useEffect, useState } from "react";

type Device = "ios" | "computer" | "other";

/** iPadOS asks for the desktop site and says "Macintosh"; the touch screen gives it away. */
function detect(): Device {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "other";
  return "computer";
}

/**
 * Shows a guide only on the device it is for: the Shortcut on an iPhone, the
 * bookmark on a computer. Nothing until mounted, so neither flashes up wrongly.
 * Indstillinger?alle shows both, for setting up one device from another.
 */
export function DeviceOnly({ on, children }: { on: Device; children: React.ReactNode }) {
  const [device, setDevice] = useState<Device | null>(null);
  useEffect(() => setDevice(detect()), []);
  return device === on ? children : null;
}
