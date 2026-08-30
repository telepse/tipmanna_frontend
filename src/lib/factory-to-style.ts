import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "./animationMode";
import {
  createAnimationFromStyleName,
  type StyleCharacter,
  type StyleCharacterInput,
} from "./animation-style-registry";

export type { StyleCharacter, StyleCharacterInput };

export function createAnimationFromStyle(
  character: StyleCharacter,
  mode: AnimationMode,
  container?: HTMLElement
): AnimationHandle {
  if (container) {
    const original = document.body.appendChild.bind(document.body);
    document.body.appendChild = function <T extends Node>(node: T): T {
      return container.appendChild(node) as T;
    };
    try {
      return createAnimationFromStyleName(character, mode);
    } finally {
      document.body.appendChild = original;
    }
  }
  return createAnimationFromStyleName(character, mode);
}
