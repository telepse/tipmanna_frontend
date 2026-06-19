"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/redux/store";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { NavigationProgressProvider } from "@/components/navigation/navigation-progress-provider";
import { TvAnalyticsAuthBridge } from "@/components/tv-analytics-auth-bridge";
import { SideChickProvider } from "@/components/community/side-chick-provider";
import { FeatureCardTipProvider } from "@/components/video-feature/feature-card-tip-context";
import { PwaInstallController } from "@/components/pwa/pwa-install-controller";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate
        loading={null}
        persistor={persistor}
      >
        <NavigationProgressProvider>
          <TvAnalyticsAuthBridge />
          <SideChickProvider>
            <FeatureCardTipProvider>
              <PwaInstallController />
              <ClientErrorBoundary>{children}</ClientErrorBoundary>
            </FeatureCardTipProvider>
          </SideChickProvider>
        </NavigationProgressProvider>
      </PersistGate>
    </Provider>
  );
}
