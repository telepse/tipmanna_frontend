/* eslint-disable @typescript-eslint/no-explicit-any */
export interface AnimationHandle {
  [x: string]: any;
  stop: () => void;
  finished: Promise<void>;
}
