"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  parseNotificationDrawerQuery,
  stripNotificationDrawerParams,
  type NotificationDrawerAccountTab,
} from "@/lib/notification-drawer-url";

export function useNotificationDrawerQuery(): {
  openDrawer: boolean;
  accountTab: NotificationDrawerAccountTab;
  consumeParams: () => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "/explore";

  const parsed = useMemo(
    () => parseNotificationDrawerQuery(searchParams),
    [searchParams]
  );

  const consumeParams = useCallback(() => {
    if (!parsed.openDrawer) return;
    const next = stripNotificationDrawerParams(
      new URLSearchParams(searchParams.toString())
    );
    const q = next.toString();
    router.replace(`${pathname}${q ? `?${q}` : ""}`, { scroll: false });
  }, [parsed.openDrawer, pathname, router, searchParams]);

  return {
    openDrawer: parsed.openDrawer,
    accountTab: parsed.accountTab,
    consumeParams,
  };
}
