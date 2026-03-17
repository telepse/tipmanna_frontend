/* eslint-disable @typescript-eslint/no-explicit-any */
import { burstStyle } from "../animation-styles/burst";
import { fallStyle } from "../animation-styles/fall";
import { luxuriousStyle } from "./luxuriousStyle";
import { screenShakeStyle } from "../animation-styles/screen-shake";
import { popAndShootStyle } from "../animation-styles/pop-and-shoot";
import { spinStyle } from "../animation-styles/spin";
import { confettiStyle } from "../animation-styles/confetti";
import { floatStyle } from "../animation-styles/float";

export function createFactoryFromStyle(data: any, mode: "preview" | "payment") {
  switch (data.style) {
    case "Confetti":
      return () =>
        confettiStyle({
          mode,
          tips: data.selectedTips,
        });

    case "Pop and Shoot":
      return () =>
        popAndShootStyle({
          icons: data.selectedTips,
          mode,
        });

    case "Burst":
      return () =>
        burstStyle({
          icons: data.selectedTips,
          mode,
        });

    case "Spin":
      return () =>
        spinStyle({
          icons: data.selectedTips,
          mode,
        });

    case "Float":
      return () =>
        floatStyle({
          icons: data.selectedTips,
          duration: 20000,
          mode,
        });

    case "Fall":
      return () =>
        fallStyle({
          icons: data.selectedTips,
          mode,
        });

    case "Luxurious":
      return () =>
        luxuriousStyle({
          videos: ["/icons/crown.webm"],
          mode,
        });

    case "Screen Shake":
      return () =>
        screenShakeStyle({
          icons: data.selectedTips,
          mode,
        });

    default:
      return () => ({
        stop: () => {},
        finished: Promise.resolve(),
      });
  }
}
