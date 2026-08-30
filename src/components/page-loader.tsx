"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react"; // Optional spinner icon

export default function PageLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate page load or wait for resources
    const timer = setTimeout(() => setLoading(false), 2000); // 2s fake load
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-6 shadow-lg">
          <Loader2 className="text-primary h-10 w-10 animate-spin" />
          <span className="text-lg font-semibold text-gray-700">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
