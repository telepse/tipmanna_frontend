"use client";

import Image from "next/image";

// Third-party imports
import { Home, Flame, Star, Medal, Heart, Bookmark } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// Local imports
import { useTV } from "../tv-provider";

export function TVSidebar() {
  const { selectedTag, setSelectedTag, scrollToSection } = useTV();

  const items = [
    {
      title: "Home",
      key: "home",
      icon: Home,
    },
    {
      title: "Top contents",
      key: "top",
      icon: Flame,
    },
    {
      title: "Latest contents",
      key: "latest",
      icon: Star,
    },
    {
      title: "Spotlight",
      key: "spotlight",
      icon: Medal,
    },
    {
      title: "Most Tipped Contents",
      key: "mostTipped",
      icon: Heart,
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
    <Sidebar className="custom-scrollbar mt-[57px] h-[calc(100vh-164px)] w-52 overflow-y-scroll border-t bg-white">
      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => scrollToSection(item.key)}
                    className="hover:bg-secondary/20 h-8 text-sm"
                  >
                    <item.icon className="text-gray-500" />
                    <span className="text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem key="saved">
                <SidebarMenuButton
                  onClick={() => console.log("saved button clicked")}
                >
                  <Bookmark className="text-gray-500" />{" "}
                  <span className="text-sm">Saved Videos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                      onClick={() => {
                        setSelectedTag(item.title);
                        console.log("selectedTag", item.title);
                      }}
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
      </SidebarContent>
    </Sidebar>
  );
}
