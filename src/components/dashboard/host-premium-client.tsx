"use client";

import { useState } from "react";

// Third-party imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Local imports
import { DashboardHeading } from "@/components/dashboard-heading";
import { HostVideoCoOwnersClient } from "@/components/dashboard/host-video-co-owners-client";
import { HostVideoRequestsClient } from "@/components/dashboard/host-video-requests-client";

export const HostPremiumClient = () => {
  const [tabType, setTabType] = useState<"video_requests" | "video_coowners">(
    "video_requests"
  );

  return (
    <section className="flex flex-col gap-6">
      <DashboardHeading
        title="Host Premium"
        subtitle="Manage your premium plan and features."
      />

      <Tabs
        value={tabType}
        onValueChange={val =>
          setTabType(val as "video_requests" | "video_coowners")
        }
        className="section px-0"
      >
        <TabsList className="flex h-14! w-full gap-1">
          <TabsTrigger
            value="video_requests"
            className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
          >
            Video Requests
          </TabsTrigger>
          <TabsTrigger
            value="video_coowners"
            className="data-[state=active]:border-b-primary h-13! rounded-none bg-white font-semibold data-[state=active]:border-b-2"
          >
            Video Co-owners
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="video_requests"
          className="mt-6 space-y-6"
        >
          <HostVideoRequestsClient />
        </TabsContent>

        <TabsContent
          value="video_coowners"
          className="mt-6 space-y-6"
        >
          <HostVideoCoOwnersClient />
        </TabsContent>
      </Tabs>
    </section>
  );
};
