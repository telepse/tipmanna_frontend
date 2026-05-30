/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const TopEvents = dynamic(() => import("./top-events"), { ssr: false });

export default function TopEventsLazy({ events }: { events: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? <TopEvents events={events} /> : null}</div>;
}
