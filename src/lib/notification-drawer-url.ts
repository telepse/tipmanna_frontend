export type NotificationDrawerAccountTab = "tipper" | "host";

export function parseNotificationDrawerQuery(searchParams: URLSearchParams): {
  openDrawer: boolean;
  accountTab: NotificationDrawerAccountTab;
} {
  const drawer = searchParams.get("drawer")?.trim();
  if (drawer !== "notifications") {
    return { openDrawer: false, accountTab: "tipper" };
  }
  const tab = searchParams.get("notifications")?.trim();
  const accountTab: NotificationDrawerAccountTab =
    tab === "host" ? "host" : "tipper";
  return { openDrawer: true, accountTab };
}

export function buildNotificationDrawerUrl(
  accountTab: NotificationDrawerAccountTab = "tipper"
): string {
  return `/explore?drawer=notifications&notifications=${accountTab}`;
}

export function stripNotificationDrawerParams(
  searchParams: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("drawer");
  next.delete("notifications");
  return next;
}
