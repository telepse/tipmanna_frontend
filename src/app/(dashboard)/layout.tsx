"use server";

import Link from "next/link";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { ProtectedRoute } from "@/components/protected-route";
import { SuperadminLoginHandler } from "@/components/auth/superadmin-login-handler";
import { HostDashboardSessionTouch } from "@/components/auth/host-dashboard-session-touch";
import { HostDashboardGate } from "@/components/auth/host-dashboard-gate";
import { HostSessionProvider } from "@/contexts/host-session-context";
import { DashboardFooter } from "@/components/footer/dashboard-footer";
import { SidebarWrapper } from "@/components/dashboard/sidebar-wrapper";

const legalLinks = [
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms & Condition" },
];

const currentYear = new Date().getFullYear();

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <HostSessionProvider enabled>
          <SidebarWrapper />
          <main className="flex max-w-full min-w-0 flex-1 overflow-x-hidden">
            <div className="bg-gray max-w-full min-w-0 flex-1 overflow-x-hidden">
              <div className="section bg-gray max-w-full min-w-0 overflow-x-hidden">
                <SuperadminLoginHandler />
                <HostDashboardSessionTouch />
                <div className="max-w-full min-w-0 overflow-x-hidden overflow-y-auto pb-16">
                  <SidebarTrigger />
                  <HostDashboardGate>{children}</HostDashboardGate>
                </div>

                <div className="sticky bottom-10">
                  <DashboardFooter />
                </div>

                <div className="bg-card fixed bottom-0 left-0 z-10 flex w-full items-center gap-4 rounded-md border-t p-4 md:left-64">
                  <p className="text-muted-foreground text-xs break-normal sm:text-sm">
                    &copy;{currentYear} Tipmanna. All rights reserved.
                  </p>

                  <div className="-mt-4 flex flex-wrap gap-2 sm:mt-0 md:ml-[496px] md:gap-4">
                    {legalLinks.map((item, index) => (
                      <Link
                        href={item.href}
                        key={index}
                        className="text-muted-foreground text-xs hover:underline md:text-sm"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </HostSessionProvider>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
