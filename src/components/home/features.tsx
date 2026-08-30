"use client";

import { Fragment, useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import {
  ArrowBigRight,
  CloudUpload,
  Mic,
  Share2,
  Sprout,
  Zap,
} from "lucide-react";

import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { Badge } from "@/components/shared/badge";
import { WHAT_YOU_CREATE } from "@/constants";

const CreateDialog = dynamic(
  () => import("./create-dialog").then(m => m.CreateDialog),
  { ssr: false }
);

export default function Features() {
  const [openPopup, setOpenPopup] = useState(false);

  return (
    <section className="wrapper section items-center py-6 lg:py-12">
      <Badge
        title="Create"
        isWhite={true}
      />

      <div className="space-y-2">
        <Title
          id="create-heading"
          align="center"
          size="lg"
          className="w-full"
        >
          Everything starts with <br className="hidden lg:block" /> what you{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            create.{" "}
          </span>
        </Title>
        <Paragraph
          align="center"
          color="muted"
          className="mt-1 leading-relaxed"
        >
          Your channel is where participation begins.{" "}
          <br className="hidden sm:block" /> Upload videos, or go live, share!{" "}
          <br />
          Build moments people return for.
        </Paragraph>
      </div>

      <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
        {WHAT_YOU_CREATE.map((item, index) => (
          <Fragment key={index}>
            <div
              className={`flex items-center gap-2 rounded-full border border-black px-4 py-2 text-xs sm:text-sm ${item.className}`}
            >
              <item.icon className={`size-4 ${item.iconClassName}`} />
              {item.label}
            </div>

            {index < WHAT_YOU_CREATE.length - 1 && (
              <ArrowBigRight className="size-4" />
            )}
          </Fragment>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-2 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-xs text-black sm:text-sm">
            <Mic className="text-primary size-4" />
            Create
          </div>
          <ArrowBigRight className="size-3" />
          <div className="flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2 text-xs text-white sm:text-sm">
            <CloudUpload className="size-4" />
            Upload
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2 text-xs text-white sm:text-sm">
            <Share2 className="size-4" />
            Share
          </div>
          <ArrowBigRight className="size-3" />
          <div className="flex items-center gap-2 rounded-full border border-black bg-black px-4 py-2 text-xs text-white sm:text-sm">
            <Zap className="size-4" />
            Discovery
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowBigRight className="size-3" />
          <div className="flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-xs text-black sm:text-sm">
            <Sprout className="text-primary size-4" />
            Grow
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className="bg-primary mt-8 w-fit text-white shadow-[4px_4px_0px_black] hover:bg-black/80 hover:text-white"
        onClick={() => setOpenPopup(true)}
      >
        Create your channel
      </Button>

      {openPopup ? (
        <CreateDialog
          openPopup={openPopup}
          setOpenPopup={setOpenPopup}
        />
      ) : null}
    </section>
  );
}
