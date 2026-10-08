import type { Metadata } from "next";

import { WatchEventCodePicker } from "@/components/watch/watch-event-code-picker";

export const metadata: Metadata = {
  title: "Tipmanna Watch — Screen Display",
};

export default function WatchScreenPickerPage() {
  return <WatchEventCodePicker />;
}
