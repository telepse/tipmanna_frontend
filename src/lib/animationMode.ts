export type AnimationMode = "preview" | "payment";

export interface AnimationHandle {
  stop: () => void;
  finished: Promise<void>;
}

export interface BaseAnimationOptions {
  mode: AnimationMode;
}
