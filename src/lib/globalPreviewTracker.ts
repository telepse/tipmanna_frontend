// import { AnimationHandle } from "@/types/animation.types";

// let activePreviewHandles: AnimationHandle[] = [];

// export function startPreviewAnimation(factory: () => AnimationHandle) {
//   // stop all existing previews
//   activePreviewHandles.forEach(h => h.stop());
//   activePreviewHandles = [];

//   const handle = factory();
//   activePreviewHandles.push(handle);

//   handle?.finished?.finally(() => {
//     activePreviewHandles = activePreviewHandles.filter(h => h !== handle);
//   });

//   return handle;
// }
