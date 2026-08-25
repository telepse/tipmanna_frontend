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
import { ChunkLoadRecovery } from "@/components/chunk-load-recovery";
import { VisitorAutoLogoutWrapper } from "@/components/VistorAutoLogoutWrapper";
import { SessionActivityPinger } from "@/components/auth/session-activity-pinger";
import { AuthIdentityBootstrap } from "@/components/auth/auth-identity-bootstrap";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate
        loading={null}
        persistor={persistor}
      >
        <NavigationProgressProvider>
          <ChunkLoadRecovery />
          <VisitorAutoLogoutWrapper>
            <SessionActivityPinger />
            <AuthIdentityBootstrap />
            <TvAnalyticsAuthBridge />
            <SideChickProvider>
              <FeatureCardTipProvider>
                <PwaInstallController />
                <ClientErrorBoundary>{children}</ClientErrorBoundary>
              </FeatureCardTipProvider>
            </SideChickProvider>
          </VisitorAutoLogoutWrapper>
        </NavigationProgressProvider>
      </PersistGate>
    </Provider>
  );
}
