"use client";

import Image from "next/image";
import Link from "next/link";

// Third-party imports
import { SquarePen, User } from "lucide-react";
import { useSelector } from "react-redux";

// Local imports
import { RootState } from "@/redux/store";

export const HostBanner = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const full_name = user!.fullName;

  let eventSlug;
  if (user?.role === "HOST") {
    eventSlug = user?.eventSlug;
  }

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(to bottom, #F57D11, #E5740E, #B65B09)`,
      }}
      className="z-10 w-full rounded-md"
    >
      <div className="relative mx-auto hidden max-w-4xl justify-between sm:flex">
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-full bg-white">
            <User className="text-primary size-14" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              {full_name}
            </h2>
            <Link
              href={`/host/${eventSlug!}/settings`}
              className="flex w-fit items-center gap-2 rounded border border-white/50 px-4 py-2 text-white"
            >
              <SquarePen className="size-4 text-white/90" /> Edit profile
            </Link>
          </div>
        </div>

        <div className="relative -mt-[41px] flex h-64 w-96 flex-col items-end overflow-hidden">
          <Image
            src="/assets/host-story.png"
            alt="Host story"
            width={500}
            height={500}
            className="absolute inset-0 z-50 mt-24 h-60 w-full [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] object-cover sm:h-60"
          />
        </div>

        <div className="absolute right-0 mt-12 -mr-24 h-60 w-[397px] -rotate-[20deg] overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]">
          <Image
            src="/assets/host-blob.png"
            alt="Host blob"
            width={500}
            height={500}
            priority
            className="z-10 h-full w-full object-cover"
            style={{ backgroundSize: "100% 100%" }}
          />
          <div className="absolute inset-0 z-20 bg-gradient-to-b from-transparent via-white to-white" />
        </div>
      </div>
    </div>
  );
};
