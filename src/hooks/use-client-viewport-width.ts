"use client";

import { useEffect, useState } from "react";

/** SSR-safe viewport width; returns 0 until mounted. */
export function useClientViewportWidth(): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}
