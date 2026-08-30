"use client";

import { useSearchParams } from "next/navigation";

import { ArrowLeft, Info, Share2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Paragraph } from "../shared/paragraph";
import { Title } from "../shared/title";
import { toast } from "react-toastify";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  iTipped: number;
  variant?: "owner" | "public" | "drawer";
  profileSlug?: string;
  showOwnerControls?: boolean;
}

export const VisitorProfileBanner = ({
  iTipped,
  variant = "owner",
  profileSlug,
  showOwnerControls = false,
}: Props) => {
  const isDrawer = variant === "drawer";
  const isPublic = variant === "public";
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const handleBack = () => {
    router.push(from || "/explore");
  };

  const handleShare = async () => {
    const slug = profileSlug?.trim();
    if (!slug) return;
    const url = `${window.location.origin}/visitor/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Visitor on Tipmanna", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not share profile link");
    }
  };

  return (
    <div
      style={{
        backgroundImage: `linear-gradient(to bottom, #321801, #321801, #321801)`,
      }}
      className="relative w-full"
    >
      {from && !isDrawer ? (
        <Button
          onClick={handleBack}
          className="open_sans absolute top-4 left-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white sm:text-base lg:top-8 lg:left-8"
        >
          <ArrowLeft className="size-5" /> <span>Back to event</span>
        </Button>
      ) : null}

      <div className={`mx-auto max-w-2xl px-4 ${isDrawer ? "py-3" : "py-6"}`}>
        <div className="flex flex-col items-center gap-4 text-white sm:hidden">
          <div className="relative mt-6 flex items-center justify-center">
            <div className="flex size-18 items-center justify-center rounded-full bg-white">
              <UserRound className="size-10 text-[#321801]" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Paragraph
              weight="bold"
              color="white"
              className="text-lg"
            >
              Visitor
            </Paragraph>
            {(isPublic || isDrawer) && !showOwnerControls ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Visitor profile expiry"
                    >
                      <Info className="size-4 text-white/80" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    This tipper profile may expire in 24 hours if unclaimed by
                    the owner.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-4">
            <span className="rounded-md border border-white px-3 py-1 text-sm">
              Total Tipped
            </span>
            <Paragraph
              weight="bold"
              color="white"
              className="text-lg"
            >
              &pound;{Number(iTipped).toFixed(2)}
            </Paragraph>
            <Button
              size="icon"
              className="bg-transparent hover:bg-white/10"
              onClick={handleShare}
              type="button"
            >
              <Share2 className="text-white/80" />
            </Button>
          </div>

          <div className="mt-4 ml-auto text-sm font-semibold text-white/80 italic">
            <span className="text-secondary/80">tip</span>
            <span className="text-white">manna</span>
          </div>
        </div>

        <div className="hidden justify-between sm:flex">
          <div className="flex gap-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-white">
              <UserRound className="text-[#321801]" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  Visitor
                </Paragraph>
                {(isPublic || isDrawer) && !showOwnerControls ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Visitor profile expiry"
                        >
                          <Info className="size-4 text-white/80" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        This tipper profile may expire in 24 hours if unclaimed
                        by the owner.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>

              <div className="flex items-center gap-4">
                <span className="rounded-md border border-white bg-[#321801] px-3 py-1 text-sm text-white">
                  Total Tipped
                </span>
                <Paragraph
                  weight="bold"
                  color="white"
                >
                  &pound;{Number(iTipped).toFixed(2)}
                </Paragraph>
                <Button
                  size="icon"
                  className="bg-[#321801]"
                  onClick={handleShare}
                  type="button"
                >
                  <Share2 className="text-white/80" />
                </Button>
              </div>
            </div>
          </div>

          <Title size="sm">
            <span className="text-secondary/80">tip</span>
            <span className="text-white">manna</span>
          </Title>
        </div>
      </div>
    </div>
  );
};
