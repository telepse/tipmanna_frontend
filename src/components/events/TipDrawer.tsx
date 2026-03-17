// // export const TipDrawer = () => {
//   const toggleTip = (characterId: string) => {
//     const eventId = getEventId();
//     const tipperId = getTipperId();

//     // Text tip (unchanged)
//     if (characterId === "b3fd81b5-6743-42cb-8df7-c08606bcd43b") {
//       setTextTipActive(true);
//       if (!selectedTips.includes("Text")) {
//         dispatch(setSelectedTips([...selectedTips, "Text"]));
//       }
//       return;
//     }

//     const character = tippingCharacters.find(c => c.id === characterId);
//     if (!character) return;

//     dispatch(setSelectedTips([...selectedTips, character.name]));

//     // Preview container ONLY
//     const container =
//       document.getElementById("preview-animation-root") || document.body;

//     switch (character.styleName) {
//       case "Confetti":
//         startPreview(eventId, tipperId, () =>
//           triggerConfetti({
//             tips: [character.name],
//           })
//         );
//         break;

//       case "Pop and Shoot":
//         startPreview(eventId, tipperId, () =>
//           shootAndPop({
//             icons: [character.iconUrl],
//           })
//         );
//         break;

//       case "Float":
//         startPreview(eventId, tipperId, () =>
//           triggerSpiralFloat({
//             icons: [character.iconUrl],
//             duration: 20000,
//           })
//         );
//         break;

//       case "Burst":
//         startPreview(eventId, tipperId, () =>
//           burstEffect({
//             icons: [character.iconUrl],
//             spread: 300,
//             // duration: 5000,
//             containerId: "preview-animation-root",
//             isPreview: true,
//           })
//         );
//         break;

//       case "Screen Shake":
//         startPreview(eventId, tipperId, () =>
//           triggerIconScreenShake({
//             icons: [character.iconUrl],
//             duration: 3000,
//             target: document.body,
//           })
//         );
//         break;

//       case "Luxurious":
//         startPreview(eventId, tipperId, () =>
//           luxuriousStyle({
//             videos: ["/icons/crown.webm"],
//             containerId: "preview-animation-root",
//             isPreview: true,
//           })
//         );
//         break;

//       case "Fall":
//         startPreview(eventId, tipperId, () =>
//           fallEffect({
//             icons: [character.iconUrl],
//             containerId: "preview-animation-root",
//             fallCount: 10, // ✅ PREVIEW INTENT (few, complete fall)
//             isPreview: true,
//           })
//         );
//         break;

//       case "Spin":
//         startPreview(eventId, tipperId, () =>
//           triggerSpin({
//             icons: [character.iconUrl],
//             container: container,
//           })
//         );
//         break;

//       default:
//         console.warn(
//           `No preview animation defined for style: ${character.styleName}`
//         );
//     }
//   };
// };
