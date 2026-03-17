// // Fastest approach - use Stripe methods directly
// "use client";

// import { useEffect } from "react";
// import { useStripe } from "@stripe/react-stripe-js";

// export const CustomExpressButtons = () => {
//   const stripe = useStripe();

//   const handleApplePay = async () => {
//     // Check availability immediately
//     const canUseApplePay = await stripe?.canMakeApplePayPayments();

//     if (canUseApplePay) {
//       // Use Payment Request API directly
//       const paymentRequest = stripe?.paymentRequest({
//         country: "US",
//         currency: "gbp",
//         total: { label: "Total", amount: 1000 },
//       });

//       // Show native Apple Pay sheet
//       paymentRequest?.show();
//     }
//   };

//   const handleGooglePay = async () => {
//     // Similar direct Google Pay integration
//   };

//   return (
//     <div className="flex gap-2">
//       <button
//         onClick={handleApplePay}
//         className="flex-1 rounded bg-black px-4 py-3 text-white"
//       >
//         Apple Pay
//       </button>
//       <button
//         onClick={handleGooglePay}
//         className="flex-1 rounded bg-black px-4 py-3 text-white"
//       >
//         Google Pay
//       </button>
//     </div>
//   );
// };
