"use client";
import { useEffect, useState } from "react";

export default function ShowAmountFromLocalStorage() {
  const [amount, setAmount] = useState<string | null>(null);

  useEffect(() => {
    setAmount(localStorage.getItem("amount"));
  }, []);

  return (
    <span className="inline-block text-center font-semibold">
      &pound;{amount ?? 0}
    </span>
  );
}
