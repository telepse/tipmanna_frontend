// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";

// import {
//   useStripe,
//   PaymentRequestButtonElement,
// } from "@stripe/react-stripe-js";
// import type { PaymentRequest } from "@stripe/stripe-js";
// import { createPaymentIntentAction } from "@/actions/payments";

// type Character = {
//   name: string;
//   time: string;
//   price: number;
//   purchasedAt?: string | Date;
// };

// export default function PaymentRequestButton({
//   amount,
//   currency = "gbp",
//   eventId,
//   userId,
//   role,
//   characters,
// }: {
//   amount: number;
//   currency: string;
//   eventId: string;
//   userId: string;
//   role: string;
//   characters: Character[];
// }) {
//   const stripe = useStripe();

//   const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
//     null
//   );
//   const [canMakePayment, setCanMakePayment] = useState(false);

//   const router = useRouter();

//   useEffect(() => {
//     if (!stripe) return;

//     const pr = stripe.paymentRequest({
//       country: "US",
//       currency,
//       total: {
//         label: "Tipmanna",
//         amount: Math.round(amount * 100),
//       },
//       requestPayerName: true,
//       requestPayerEmail: true,
//     });

//     // Only mount the button if supported
//     pr.canMakePayment().then(result => {
//       if (result) {
//         setPaymentRequest(pr);
//         setCanMakePayment(true);
//       } else {
//         setCanMakePayment(false);
//       }
//     });

//     pr.on("paymentmethod", async event => {
//       try {
//         const data = await createPaymentIntentAction({
//           amount,
//           currency: "gbp",
//           eventId,
//           userId,
//           role,
//           characters,
//         });

//         const { error, paymentIntent } = await stripe.confirmCardPayment(
//           data.clientSecret,
//           {
//             payment_method: event.paymentMethod.id,
//           }
//         );

//         if (error) {
//           event.complete("fail");
//           console.error(error.message);
//           alert(error.message);
//         } else {
//           event.complete("success");
//           console.log("Payment success:", paymentIntent.id);
//           alert("✅ Payment successful!");
//           router.push(
//             `/success?session_id=${paymentIntent.id}&amount=${amount}`
//           );
//         }
//       } catch (err) {
//         event.complete("fail");
//         console.error("Payment request failed:", err);
//       }
//     });
//   }, [stripe, amount, currency, characters, eventId, userId, router, role]);

//   // Render only if paymentRequest is available
//   return (
//     <div className="w-96">
//       {canMakePayment && paymentRequest ? (
//         <PaymentRequestButtonElement
//           options={{
//             paymentRequest,
//             style: {
//               paymentRequestButton: {
//                 type: "buy",
//                 theme: "dark",
//                 height: "50px",
//               },
//             },
//           }}
//         />
//       ) : (
//         <p className="mt-2 text-sm text-gray-500">
//           GPay / Apple Pay not available.
//         </p>
//       )}
//     </div>
//   );
// }
