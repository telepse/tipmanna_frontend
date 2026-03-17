/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Third-party imports
import { Home, Flame, Star, Medal, Heart, Bookmark } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { CiFacebook, CiInstagram, CiLinkedin } from "react-icons/ci";
import { FaXTwitter } from "react-icons/fa6";

// Local imports
import { SocialIcon } from "@/components/shared/social-icon";

type Props = {
  selectedTag: string | null;
  setSelectedTag: (tag: string) => void;
  tagFilteredContents: any[];
};

export function TVSidebar({
  selectedTag,
  setSelectedTag,
  tagFilteredContents,
}: Props) {
  const pathname = usePathname();

  const items = [
    {
      title: "Home",
      url: `/`,
      icon: Home,
      disabled: false,
    },
    {
      title: "Top contents",
      url: `/`,
      icon: Flame,
    },
    {
      title: "Latest contents",
      url: `/`,
      icon: Star,
    },
    {
      title: "Spotlight",
      url: `/`,
      icon: Medal,
    },
    {
      title: "Most Tipped Contents",
      url: `/`,
      icon: Heart,
    },
    {
      title: "Saved Videos",
      url: `/`,
      icon: Bookmark,
    },
  ];

  const categories = [
    {
      title: "Concert",
      icon: "/icons/concert.png",
    },
    {
      title: "Drama",
      icon: "/icons/theater.png",
    },
    {
      title: "Festival",
      icon: "/icons/festival.png",
    },
    {
      title: "Food",
      icon: "/icons/cooking.png",
    },
    {
      title: "Hang out",
      icon: "/icons/interview.png",
    },
    {
      title: "Islamic",
      icon: "/icons/moon.png",
    },
    {
      title: "Christian",
      icon: "/icons/book.png",
    },
    {
      title: "Corporate",
      icon: "/icons/company.png",
    },
    {
      title: "Comedy",
      icon: "/icons/comedy.png",
    },
    {
      title: "Fashion",
      icon: "/icons/woman.png",
    },
    {
      title: "Games and sport",
      icon: "/icons/game-console.png",
    },
  ];

  return (
    <Sidebar className="mt-[57px] mb-[57px] w-52 border-t bg-white">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`${pathname === item.url ? "bg-secondary/20" : ""} hover:bg-secondary/20 h-8 text-sm`}
                  >
                    <Link href={item.url}>
                      <item.icon className="text-gray-500" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={`hover:bg-secondary/20 h-8 text-sm`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTag(item.title)}
                      className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs ${
                        selectedTag === item.title
                          ? "bg-black text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      <Image
                        src={item.icon}
                        alt={item.title}
                        width={20}
                        height={20}
                        className="size-5 rounded-md text-gray-500"
                      />
                      <span className="text-xs">{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Join our community</SidebarGroupLabel>

          <div className="flex gap-2">
            <SocialIcon
              Icon={CiFacebook}
              href="https://instagram.com/tipmanna"
            />
            <SocialIcon
              Icon={FaXTwitter}
              href="https://x.com/tipmanna"
            />
            <SocialIcon
              Icon={CiInstagram}
              href="https://instagram.com/tipmanna"
            />
            <SocialIcon
              Icon={CiLinkedin}
              href="https://linkedin.com/company/tipmanna"
            />
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
