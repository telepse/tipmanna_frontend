"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

// Local imports
import { RootState } from "@/redux/store";
import { Logo } from "@/components/shared/logo";

interface Props {
  numOfEvents: number;
}

export function AppSidebar({ numOfEvents }: Props) {
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    return <p>Loading...</p>;
  }

  const { fullName, username, role } = user || {};

  let eventSlug;
  if (user?.role === "HOST") {
    eventSlug = user?.eventSlug;
  }

  const handleLogout = () => {
    // Show feedback
    toast.success("HOST account logged out");

    // Redirect to sign-in
    if (role === "HOST") {
      router.replace(`/tipper/${username}`);
    }
  };

  const isFreezed = numOfEvents < 1;

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
      freezed: isFreezed,
    },
    {
      title: "Venue Display",
      url: `/host/${eventSlug}/venue-display`,
      icon: TvMinimalPlay,
      freezed: isFreezed,
    },
    {
      title: "Top Tippers",
      url: `/host/${eventSlug}/top-tippers`,
      icon: Trophy,
      freezed: isFreezed,
    },
    {
      title: "Reports & Insights",
      url: `/host/${eventSlug}/reports`,
      icon: ChartColumn,
      freezed: isFreezed,
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
      freezed: isFreezed,
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
                      href={item.freezed ? "#" : item.url}
                      target={item.target}
                      className={
                        item.freezed ? "cursor-not-allowed opacity-50" : ""
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
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

          <div className="mt-4 flex items-center justify-between gap-1.5">
            <Link
              href={`/host/${eventSlug}/profile`}
              className="rounded-full border p-2 transition-all duration-300 hover:bg-black hover:text-white"
            >
              <UserRound className="size-5" />
            </Link>

            <Link
              href={`/host/${eventSlug}/profile`}
              className="flex flex-col gap-1"
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
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
