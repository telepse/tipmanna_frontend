"use client";

import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";

import { isVenueChromeSuppressedPath } from "@/lib/watch-portal-flag";

/** Global toasts — hidden on OBS transparent overlay routes. */
export function AppToastContainer() {
  const pathname = usePathname();
  if (isVenueChromeSuppressedPath(pathname ?? "")) {
    return null;
  }

  return (
    <ToastContainer
      position="bottom-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      aria-label="Notification messages"
      style={{ zIndex: 2147483647, position: "fixed" }}
    />
  );
}
