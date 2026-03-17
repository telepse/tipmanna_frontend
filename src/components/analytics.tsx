"use client";

import { GoogleAnalytics } from "nextjs-google-analytics";

export const Analytics = () => {
  return (
    <GoogleAnalytics
      trackPageViews
      gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""}
    />
  );
};
