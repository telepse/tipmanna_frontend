"use client";

import { useEffect, useState } from "react";

export const TextTip = () => {
  const [text, setText] = useState("");

  useEffect(() => {
    // Function to sync with localStorage
    const syncWithLocalStorage = () => {
      const value = localStorage.getItem("textTipValue") || "";
      setText(value);
    };

    // Initial sync
    syncWithLocalStorage();

    // Polling every 200ms to catch client-side changes
    const interval = setInterval(syncWithLocalStorage, 200);

    // Listen for storage events from other tabs/windows
    window.addEventListener("storage", syncWithLocalStorage);

    // Listen for tip:dropped event to clear text tip
    const handleTipDropped = () => {
      setText("");
      localStorage.removeItem("textTipValue");
    };
    window.addEventListener("tip:dropped", handleTipDropped);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", syncWithLocalStorage);
      window.removeEventListener("tip:dropped", handleTipDropped);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    localStorage.setItem("textTipValue", value);
  };

  // Hide input if empty
  if (!text) return null;

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      placeholder="Type your tip..."
      className="w-40 rounded-md border border-black px-2 py-1 text-xs text-black"
    />
  );
};
