"use client";

import { useEffect } from "react";

interface Props {
  channelId: string;
}

export const SaveChannelId = ({ channelId }: Props) => {
  useEffect(() => {
    if (channelId) {
      localStorage.setItem("channelId", channelId);
    }
  }, [channelId]);
  return null;
};
