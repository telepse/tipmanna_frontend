/**
 * Canonical animation style names from the product / DB.
 * Keep in sync with admin character configuration.
 */
import type { RoomCharacter } from "@/types";
import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "./animationMode";
import { ANIMATION_DURATION } from "./animationContract";
import { burstStyle } from "../animation-styles/burst";
import { fallStyle } from "../animation-styles/fall";
import { luxuriousStyle } from "./luxuriousStyle";
import { screenShakeStyle } from "../animation-styles/screen-shake";
import { popAndShootStyle } from "../animation-styles/pop-and-shoot";
import { spinStyle } from "../animation-styles/spin";
import { confettiStyle } from "../animation-styles/confetti";
import { floatStyle } from "../animation-styles/float";
import { goldRainStyle } from "../animation-styles/gold-rain";
import { luxuryFireworksStyle } from "../animation-styles/luxury-fireworks";
import { dragonSpiralStyle } from "../animation-styles/dragon-spiral";
import { cosmicVortexStyle } from "../animation-styles/cosmic-vortex";
import { animWarn } from "./animationDebug";
import { tracePaymentAnimation } from "./payment-animation-trace";

export const ANIMATION_STYLE_NAMES = [
  "Confetti",
  "Pop and Shoot",
  "Burst",
  "Float",
  "Screen Shake",
  "Luxurious",
  "Fall",
  "Spin",
  "Gold Rain",
  "Luxury Fireworks",
  "Dragon Spiral",
  "Cosmic Vortex",
] as const;

export type AnimationStyleName = (typeof ANIMATION_STYLE_NAMES)[number];

/** @deprecated Use AnimationStyleName */
export type KnownAnimationStyleName = AnimationStyleName;

const NAME_SET = new Set<string>(ANIMATION_STYLE_NAMES);

export function isKnownAnimationStyleName(
  name: string
): name is AnimationStyleName {
  return NAME_SET.has(name);
}

/** Minimal character shape for animation factories. */
export type StyleCharacterInput = Pick<
  RoomCharacter,
  "name" | "iconUrl" | "styleName"
>;

export type StyleCharacter = StyleCharacterInput;

const EMPTY_HANDLE: AnimationHandle = {
  stop: () => {},
  finished: Promise.resolve(),
};

type StyleFactory = (
  character: StyleCharacterInput,
  mode: AnimationMode,
  dur: number,
  isPreview: boolean
) => AnimationHandle;

export const ANIMATION_STYLE_REGISTRY = {
  Confetti: (character, mode) =>
    confettiStyle({ tips: [character.name], mode }),

  "Pop and Shoot": (character, mode) =>
    popAndShootStyle({ icons: [character.iconUrl], mode }),

  Burst: (character, mode, dur) =>
    burstStyle({
      icons: [character.iconUrl],
      spread: 300,
      duration: dur,
      mode,
    }),

  Float: (character, mode, dur) =>
    floatStyle({ icons: [character.iconUrl], mode, duration: dur }),

  "Screen Shake": (character, mode, dur) =>
    screenShakeStyle({
      icons: [character.iconUrl],
      target: document.body,
      duration: dur,
      mode,
    }),

  Luxurious: (character, mode, dur) =>
    luxuriousStyle({
      videos: ["/icons/crown.webm"],
      duration: dur,
      mode,
    }),

  Fall: (character, mode, dur, isPreview) =>
    fallStyle({
      icons: [character.iconUrl],
      fallCount: isPreview ? 10 : 60,
      duration: dur,
      mode,
    }),

  Spin: (character, mode) => spinStyle({ icons: [character.iconUrl], mode }),

  "Gold Rain": (character, mode, dur) =>
    goldRainStyle({
      icons: [character.iconUrl],
      mode,
      duration: dur,
    }),

  "Luxury Fireworks": (character, mode, dur) =>
    luxuryFireworksStyle({
      icons: [character.iconUrl],
      mode,
      duration: dur,
    }),

  "Dragon Spiral": (character, mode, dur) =>
    dragonSpiralStyle({
      icons: [character.iconUrl],
      mode,
      duration: dur,
    }),

  "Cosmic Vortex": (character, mode, dur) =>
    cosmicVortexStyle({
      icons: [character.iconUrl],
      mode,
      duration: dur,
    }),
} as const satisfies Record<AnimationStyleName, StyleFactory>;

export function createAnimationFromStyleName(
  character: StyleCharacterInput,
  mode: AnimationMode,
  _container?: HTMLElement
): AnimationHandle {
  void _container;
  const dur = ANIMATION_DURATION[mode].default;
  const isPreview = mode === "preview";
  const lookupStyleName = character.styleName;

  tracePaymentAnimation({
    stage: "style_lookup_started",
    characterName: character.name,
    styleName: character.styleName,
    lookupStyleName,
    mode,
    iconPresent: Boolean(character.iconUrl?.trim()),
  });

  if (!isKnownAnimationStyleName(character.styleName)) {
    animWarn(`Unknown animation style: ${character.styleName}`);
    tracePaymentAnimation({
      stage: "style_registry_unknown",
      characterName: character.name,
      styleName: character.styleName,
      lookupStyleName,
      mode,
      iconPresent: Boolean(character.iconUrl?.trim()),
      result: "empty_handle",
    });
    tracePaymentAnimation({
      stage: "empty_handle_returned",
      characterName: character.name,
      styleName: character.styleName,
      lookupStyleName,
      factoryName: "EMPTY_HANDLE",
    });
    return EMPTY_HANDLE;
  }

  const registryKey = character.styleName;
  const factory = ANIMATION_STYLE_REGISTRY[character.styleName];
  if (!factory) {
    animWarn(`Missing factory for style: ${character.styleName}`);
    tracePaymentAnimation({
      stage: "empty_handle_returned",
      characterName: character.name,
      styleName: character.styleName,
      lookupStyleName,
      registryKey,
      factoryName: "EMPTY_HANDLE",
    });
    return EMPTY_HANDLE;
  }

  tracePaymentAnimation({
    stage: "style_registry_match",
    characterName: character.name,
    styleName: character.styleName,
    lookupStyleName,
    registryKey,
    mode,
    iconPresent: Boolean(character.iconUrl?.trim()),
    factoryName: character.styleName,
  });

  const handle = factory(character, mode, dur, isPreview);
  tracePaymentAnimation({
    stage: "style_factory_created",
    characterName: character.name,
    styleName: character.styleName,
    lookupStyleName,
    registryKey,
    mode,
    factoryName: character.styleName,
    result: "created",
  });
  return handle;
}
