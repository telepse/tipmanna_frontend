"use client";

import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
  WhatsappIcon,
  WhatsappShareButton,
} from "next-share";

import { ShareCopyLinkControl } from "@/components/shared/share-copy-link-control";

interface VideoShareButtonsProps {
  url: string;
  title: string;
}

export function VideoShareButtons({ url, title }: VideoShareButtonsProps) {
  return (
    <>
      <ShareCopyLinkControl url={url} />
      <WhatsappShareButton
        url={url}
        title={title}
      >
        <WhatsappIcon
          size={32}
          round
        />
      </WhatsappShareButton>

      <FacebookShareButton
        url={url}
        quote={title}
      >
        <FacebookIcon
          size={32}
          round
        />
      </FacebookShareButton>

      <TwitterShareButton
        url={url}
        title={title}
      >
        <TwitterIcon
          size={32}
          round
        />
      </TwitterShareButton>
    </>
  );
}
