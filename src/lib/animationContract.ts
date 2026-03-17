export type AnimationMode = "preview" | "payment";

export const ANIMATION_DURATION = {
  preview: {
    min: 3000,
    max: 4000,
    default: 3500,
  },
  payment: {
    min: 8000,
    max: 10000,
    default: 9000,
  },
};
