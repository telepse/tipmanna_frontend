"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const Slider = dynamic(
  () => import("./image-slider").then(mod => mod.default),
  { ssr: false }
);

export function LazySlider() {
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

  return <div ref={ref}>{visible ? <Slider /> : null}</div>;
}
