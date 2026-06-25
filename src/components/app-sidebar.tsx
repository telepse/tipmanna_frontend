"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Third-party imports
import {
  // Bell,
  Bolt,
  ChartColumn,
  Home,
  Calendar,
  LogOut,
  Trophy,
  UserRoundPen,
  UserRoundCog,
  TvMinimalPlay,
  UserRound,
  Crown,
  Users,
  Send,
  Bell,
  Handshake,
  Sparkles,
  Wallet,
  Banknote,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { performAuthLogout } from "@/lib/auth-logout";

// Local imports + notifications
import { RootState, type AppDispatch } from "@/redux/store";
import { Logo } from "@/components/shared/logo";
import { subscribeHostInAppNotifications } from "@/lib/host-notification-channel";
import { getNotificationsUnreadCountAction } from "@/actions/notifications";
import { cn } from "@/lib/utils";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";

interface Props {
  numOfEvents: number;
}

export function AppSidebar({ numOfEvents }: Props) {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const [notifUnread, setNotifUnread] = useState(0);
  const { hasActivePremium } = useHostPlanCapabilities();

  const role = user?.role;
  const hostSubscriptionTier =
    user?.role === "HOST" ? user.hostSubscriptionTier : undefined;
  const hasCommunityPlan = hostSubscriptionTier === "HOST_COMMUNITY";
  const communityFeatureOn =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

  useEffect(() => {
    if (role !== "HOST" || !user || !("id" in user) || !user.id) {
      setNotifUnread(0);
      return;
    }
    const hostId = user.id;

    const refreshUnread = async () => {
      const r = await getNotificationsUnreadCountAction();
      if (r.success && r.data) setNotifUnread(r.data.count);
      else setNotifUnread(0);
    };

    void refreshUnread();

    return subscribeHostInAppNotifications(hostId, () => {
      void refreshUnread();
    });
  }, [role, user]);

  if (!user) {
    return <p>Loading...</p>;
  }

  const { fullName, username, role: userRole } = user;

  const handleLogout = async () => {
    await performAuthLogout(dispatch);
    toast.success("HOST account logged out");
    router.replace("/sign-in");
  };

  const handleContinueAsTipper = () => {
    if (!user?.email) {
      router.push("/sign-in?tab=tipper");
      return;
    }
    router.push(`/sign-in?email=${encodeURIComponent(user.email)}&tab=tipper`);
  };

  const isFreezed = numOfEvents < 1;
  const hasPremiumPlan = hostSubscriptionTier === "HOST_PREMIUM";
  const showCoOwnerNav = hasPremiumPlan || hasCommunityPlan;
  const videoRequestsUiOn =
    process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !== "false";

  let eventSlug;
  if (userRole === "HOST") {
    eventSlug = user.eventSlug;
  }

  const items = [
    {
      title: "Dashboard",
      url: `/host/${eventSlug}`,
      icon: Home,
      disabled: false,
    },
    {
      title: "Manage Event",
      url: `/host/${eventSlug}/manage-event`,
      icon: Calendar,
      // freezed: isFreezed,
    },
    {
      title: "Venue Display",
      url: `/host/${eventSlug}/venue-display`,
      icon: TvMinimalPlay,
      // freezed: isFreezed,
    },
    {
      title: "Top Tippers",
      url: `/host/${eventSlug}/top-tippers`,
      icon: Trophy,
      // freezed: isFreezed,
    },
    {
      title: "Reports & Insights",
      url: `/host/${eventSlug}/reports`,
      icon: ChartColumn,
      // freezed: isFreezed,
    },
    {
      title: "Video requests",
      url: `/host/${eventSlug}/video-requests`,
      icon: Sparkles,
      // freezed: isFreezed,
      plan: videoRequestsUiOn,
      premiumHint: true,
    },
    {
      title: "Host Premium",
      url: `/host/${eventSlug}/host-premium`,
      icon: Crown,
      disabled: false,
      premiumHint: true,
    },
    {
      title: "Host Community",
      url: `/host/${eventSlug}/host-community`,
      icon: Users,
      disabled: false,
      premiumHint: true,
    },
    {
      title: "Community Sends",
      url: `/host/${eventSlug}/community-sends`,
      icon: Send,
      // freezed: isFreezed,
      plan: hasCommunityPlan && communityFeatureOn,
    },
    {
      title: "Revenue & Payouts",
      url: `/host/${eventSlug}/revenue`,
      icon: Banknote,
      disabled: false,
    },
    {
      title: "Community payouts",
      url: `/host/${eventSlug}/community-payouts`,
      icon: Wallet,
      // freezed: isFreezed,
      plan: hasCommunityPlan && communityFeatureOn,
    },
    {
      title: "Notifications",
      url: `/host/${eventSlug}/notifications`,
      icon: Bell,
      // freezed: isFreezed,
    },
    // {
    //   title: "Notification",
    //   url: `/host/${eventSlug}/notification`,
    //   icon: Bell,
    //   freezed: isFreezed,
    // },
    {
      title: "Tipper Profile",
      url: `/tipper/${username}`,
      icon: UserRoundPen,
      target: "_blank",
      freezed: false,
    },
    {
      title: "Host Fees",
      url: `/host/${eventSlug}/host-fees`,
      icon: UserRoundCog,
      // freezed: isFreezed,
    },
    {
      title: "Video co-owners",
      url: `/host/${eventSlug}/video-co-owners`,
      icon: Handshake,
      // freezed: isFreezed,
      plan: showCoOwnerNav,
      premiumHint: true,
    },
  ];

  return (
    <Sidebar className="bg-white">
      <SidebarContent>
        <SidebarGroup>
          <Logo />

          <SidebarGroupContent className="mt-4">
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`${pathname === item.url ? "bg-secondary/20" : ""} hover:bg-secondary/20 h-10`}
                  >
                    <Link
                      href={
                        item.freezed || item.plan === false ? "#" : item.url
                      }
                      target={item.target}
                      className={cn(
                        "flex w-full items-center gap-2",
                        item.freezed || item.plan === false
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      )}
                    >
                      <item.icon />
                      <span className="flex-1">{item.title}</span>
                      {"premiumHint" in item &&
                      item.premiumHint &&
                      !hasActivePremium &&
                      !item.freezed &&
                      item.plan !== false ? (
                        <Crown
                          className="text-amber-600 size-3.5 shrink-0"
                          aria-label="Premium feature"
                        />
                      ) : null}
                      {item.title === "Notifications" &&
                      notifUnread > 0 &&
                      !item.freezed &&
                      item.plan !== false ? (
                        <span className="bg-destructive text-destructive-foreground ml-auto min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none font-semibold">
                          {notifUnread > 99 ? "99+" : notifUnread}
                        </span>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Settings Section */}
        <div className="mt-auto border-t border-gray-200 p-4 dark:border-gray-800">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className={`${pathname === `/host/${eventSlug}/settings` ? "bg-secondary/20" : ""} hover:bg-secondary/20 h-10`}
              >
                <Link href={`/host/${eventSlug}/settings`}>
                  <Bolt /> <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-1.5">
              <Link
                href={`/host/${eventSlug}/profile`}
                className="rounded-full border p-2 transition-all duration-300 hover:bg-black hover:text-white"
              >
                <UserRound className="size-5" />
              </Link>

              <Link
                href={`/host/${eventSlug}/profile`}
                className="min-w-0 flex-1 flex-col gap-1"
              >
                <span className="text-sm">{fullName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user!.email}
                </span>
              </Link>

              <Button
                variant="outline"
                size="icon"
                className="shrink-0 border-0"
                onClick={handleLogout}
              >
                <LogOut />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleContinueAsTipper}
            >
              Continue as Tipper
            </Button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
