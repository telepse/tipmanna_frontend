"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@/lib/utils";

type VirtualRailProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey: (item: T, index: number) => string;
  itemMinClassName: string;
  className?: string;
  gapClassName?: string;
  /** Extra horizontal margin for IntersectionObserver preload. */
  rootMargin?: string;
  containerRef?: RefObject<HTMLDivElement | null>;
};

function VirtualRailSlot({
  index,
  itemMinClassName,
  scrollRootRef,
  rootMargin,
  render,
}: {
  index: number;
  itemMinClassName: string;
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
  rootMargin: string;
  render: () => ReactNode;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(index < 4);

  useEffect(() => {
    const el = slotRef.current;
    const root = scrollRootRef.current;
    if (!el || !root) return;

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.target === el) {
            setNearViewport(entry.isIntersecting);
          }
        }
      },
      { root, rootMargin, threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [index, rootMargin, scrollRootRef]);

  return (
    <div
      ref={slotRef}
      className={cn("flex-shrink-0", itemMinClassName)}
    >
      {nearViewport ? (
        render()
      ) : (
        <div
          className={cn("h-full min-h-[120px] w-full", itemMinClassName)}
          aria-hidden
        />
      )}
    </div>
  );
}

export function VirtualRail<T>({
  items,
  renderItem,
  getItemKey,
  itemMinClassName,
  className,
  gapClassName = "gap-4",
  rootMargin = "300px 0px",
  containerRef,
}: VirtualRailProps<T>) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = containerRef ?? internalRef;
  const renderSlot = useCallback(
    (item: T, index: number) => renderItem(item, index),
    [renderItem]
  );

  return (
    <div
      ref={scrollRef}
      data-virtual-rail-scroll
      className={cn("scrollbar-none overflow-x-auto", className)}
    >
      <div className={cn("flex", gapClassName)}>
        {items.map((item, index) => (
          <VirtualRailSlot
            key={getItemKey(item, index)}
            index={index}
            itemMinClassName={itemMinClassName}
            scrollRootRef={scrollRef}
            rootMargin={rootMargin}
            render={() => renderSlot(item, index)}
          />
        ))}
      </div>
    </div>
  );
}
