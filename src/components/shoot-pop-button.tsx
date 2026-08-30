/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";

export const ShootPopButton = () => {
  const reactions = ["💖"];
  const [floatingReactions, setFloatingReactions] = useState([]);

  const handleReaction = (icon: string) => {
    const id = Date.now() + Math.random();
    const xOffset = Math.floor(Math.random() * 40 - 20);

    // setFloatingReactions([...floatingReactions, { id, icon, xOffset }]);
  };

  const removeReaction = (id: string) => {
    // setFloatingReactions(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        {reactions.map(icon => (
          <button
            key={icon}
            onClick={() => handleReaction(icon)}
            style={{
              fontSize: "24px",
              cursor: "pointer",
              border: "none",
              background: "transparent",
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
};
