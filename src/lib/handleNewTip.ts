// // handleNewTip.ts
// import { ANIMATION_DURATION } from "@/lib/animationContract";
// import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";
// import { stopPreviews } from "@/lib/previewController";
// import { getEventId } from "./identity";
// import { AnimationHandle } from "@/types/animation.types";
// import { RoomCharacter } from "@/types";
// import { animationExecutionRegistry } from "@/lib/animationExecutionRegistry";
// import { playDisplayPaymentAnimation } from "@/lib/DisplayPaymentController";
// import { triggerConfetti } from "@/lib/triggerConfetti";
// import { shootAndPop } from "@/lib/shootAndPop";
// import { burstEffect } from "@/lib/burstAnimation";
// import { triggerSpiralFloat } from "@/lib/triggerSpiralFloat";
// import { triggerIconScreenShake } from "@/lib/screenShake";
// import { luxuriousStyle } from "@/lib/luxuriousStyle";
// import { fallEffect } from "@/lib/fallEffect";
// import { triggerSpin } from "@/lib/spin";

// const paymentLiveSince = Date.now();
// const playedPaymentEvents = new Set<string>();

// type NewTipEvent = {
//   selectedTips: string[];
//   id: string;
//   createdAt: number;
// };

// export const handleNewTip = (data: NewTipEvent) => {
//   // 🔒 Ignore historical tips
//   if (data.createdAt < paymentLiveSince) return;

//   const eventId = getEventId();

//   stopPreviews("payment_commit");

//   const selectedCharacters = data.selectedTips
//     .map(name => data.selectedTips.find(char => char === name))
//     .filter(Boolean) as RoomCharacter[];

//   const charactersByStyle: Record<string, RoomCharacter[]> = {};
//   selectedCharacters.forEach(char => {
//     (charactersByStyle[char.styleName] ||= []).push(char);
//   });

//   Object.entries(charactersByStyle).forEach(([style, chars]) => {
//     const uniqueChars = Array.from(
//       new Map(chars.map(c => [c.name, c])).values()
//     );

//     uniqueChars.forEach(c => {
//       const executionKey = data.id;

//       if (
//         !animationExecutionRegistry.trySpawn(
//           "payment",
//           "payment-event",
//           executionKey
//         )
//       ) {
//         console.log("[handleNewTip] payment animation blocked:", executionKey);
//         return;
//       }

//       const animationFactory = () => {
//         switch (style) {
//           case "Confetti":
//             return triggerConfetti({ tips: [c.name], isPaymentMode: true });
//           case "Pop and Shoot":
//             return shootAndPop({ icons: [c.iconUrl], mode: "payment" });
//           case "Burst":
//             return burstEffect({
//               icons: [c.iconUrl],
//               spread: 300,
//               duration: ANIMATION_DURATION.payment.default,
//             });
//           case "Float":
//             return triggerSpiralFloat({ icons: [c.iconUrl], mode: "payment" });
//           case "Screen Shake":
//             return triggerIconScreenShake({
//               icons: [c.iconUrl],
//               mode: "payment",
//               duration: ANIMATION_DURATION.payment.default,
//             });
//           case "Luxurious":
//             return luxuriousStyle({
//               videos: ["/icons/crown.webm"],
//               mode: "payment",
//               duration: ANIMATION_DURATION.payment.default,
//             });
//           case "Fall":
//             return fallEffect({
//               icons: [c.iconUrl],
//               fallCount: 60,
//               mode: "payment",
//               duration: ANIMATION_DURATION.payment.default,
//             });
//           case "Spin":
//             return triggerSpin({ icons: [c.iconUrl], mode: "payment" });
//           default:
//             return { finished: Promise.resolve() } as AnimationHandle;
//         }
//       };

//       playDisplayPaymentAnimation({
//         animationId: style.toLowerCase(),
//         executionKey,
//         surface: "payment-event",
//         factory: () => wrapPaymentAnimation(animationFactory),
//       });
//     });
//   });
// };
