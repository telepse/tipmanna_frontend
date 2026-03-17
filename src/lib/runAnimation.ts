// import { burstEffect } from "./burstAnimation";

// import { triggerConfetti } from "./triggerConfetti";

// import { waitForElement } from "./waitForElement";

// type AnimationEvent = {
//     id: string;
//     selectedTips: {
//       styleName: string;
//     }[];
//   };

//   import { burstEffect } from "./burstAnimation";
//   import { triggerConfetti } from "./triggerConfetti";
//   import { waitForElement } from "./waitForElement";

//   export const runAnimation = async (event: AnimationEvent) => {
//     const container = await waitForElement("live-animation-root");

//     // Run animations
//     event.selectedTips.forEach(tip => {
//       switch (tip.styleName) {
//         case "Confetti":
//           triggerConfetti({ element: container });
//           break;

//         case "Burst":
//           burstEffect({ containerId: "live-animation-root", icons: [tip.iconUrl] });
//           break;
//       }
//     });

//     // Wait for longest possible animation duration
//     await new Promise(res => setTimeout(res, 6000));

//     // ACK ONCE, AFTER animations complete
//     fetch(`/api/animations/${event.id}/ack`, {
//       method: "POST",
//     });
//   };
