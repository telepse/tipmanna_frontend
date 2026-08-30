"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { setPushAuthToken } from "@/lib/push-auth-cache";
import type { RootState } from "@/redux/store";

export function ServiceWorkerRegistrar() {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const userId = useSelector((s: RootState) => s.auth.user?.id);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

    const sendConfig = (registration: ServiceWorkerRegistration) => {
      const target =
        registration.active || registration.waiting || registration.installing;
      target?.postMessage({ type: "SET_CONFIG", apiBase });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then(registration => {
        sendConfig(registration);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "activated") sendConfig(registration);
          });
        });
      })
      .catch(e => console.error("[SW] registration failed", e));

    const onControllerChange = () => {
      navigator.serviceWorker.ready.then(sendConfig).catch(() => {});
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  useEffect(() => {
    if (!userId || !authToken) return;
    void setPushAuthToken(authToken);
  }, [authToken, userId]);

  return null;
}
