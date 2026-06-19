"use client";

import { useEffect } from "react";

export default function HashScroll() {
  useEffect(() => {
    // Check if there is a hash in the URL on initial load
    const hash = window.location.hash;

    if (hash) {
      // Use a slight timeout to ensure DOM has fully rendered

      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  return null;
}
