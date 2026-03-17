/* eslint-disable @typescript-eslint/no-explicit-any */
// export function resolveBroadcastPosition(
//     broadcastEpoch: number,
//     totalDuration: number,
//     items: {
//         channel: {
//             id: string;
//             url: string;
//             title: string;
//         },
//         duration: number;
//     }[]
//   ) {
//     const now = Date.now();
//     const elapsed = Math.floor((now - broadcastEpoch) / 1000);

//     const positionInLoop = elapsed % totalDuration;

//     let cursor = 0;

//     for (let i = 0; i < items.length; i++) {
//       const item = items[i];
//       const end = cursor + item.duration;

//       if (positionInLoop < end) {
//         return {
//           index: i,
//           offset: positionInLoop - cursor,
//         };
//       }

//       cursor = end;
//     }

//     return { index: 0, offset: 0 };
//   }

export function resolveBroadcastPosition(
  broadcastEpoch: number,
  totalDuration: number,
  items: any[]
) {
  const now = Date.now();
  const elapsed = Math.floor((now - broadcastEpoch) / 1000);

  const position = elapsed % totalDuration;

  let cursor = 0;

  for (let i = 0; i < items.length; i++) {
    const duration = items[i].duration;

    if (position >= cursor && position < cursor + duration) {
      return {
        index: i,
        offset: position - cursor,
      };
    }

    cursor += duration;
  }

  return {
    index: 0,
    offset: 0,
  };
}
