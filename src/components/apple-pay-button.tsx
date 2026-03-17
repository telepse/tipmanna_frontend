// "use client";

// import { useEffect, useState } from "react";
// import {
//   useStripe,
//   PaymentRequestButtonElement,
// } from "@stripe/react-stripe-js";
// import { createPaymentIntentAction } from "@/actions/payments";
// import { useRouter } from "next/navigation";

// type Character = {
//   name: string;
//   time: string;
//   price: number;
//   purchasedAt?: string | Date;
// };

// export default function ApplePayButton({
//   amount,
//   currency = "gbp",
//   eventId,
//   userId,
//   userRole,
//   characters,
// }: {
//   amount: number;
//   currency: string;
//   eventId: string;
//   userId: string;
//   userRole: string;
//   characters: Character[];
// }) {
//   const stripe = useStripe();
//   const [paymentRequest, setPaymentRequest] = useState(null);
//   const [ready, setReady] = useState(false);

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

//     // Only show Apple Pay
//     pr.canMakePayment({ applePay: true }).then(result => {
//       if (result) {
//         setPaymentRequest(pr);
//         setReady(true);
//       } else {
//         console.log("Apple Pay not available");
//       }
//     });

//     pr.on("paymentmethod", async event => {
//       // call your backend to create PaymentIntent
//       const data = await createPaymentIntentAction({
//         amount,
//         currency: "gbp",
//         eventId,
//         userId,
//         userRole,
//         characters,
//       });
//       console.log(data.clientSecret);

//       const { error, paymentIntent } = await stripe.confirmCardPayment(
//         data.clientSecret,
//         {
//           payment_method: event.paymentMethod.id,
//         }
//       );
//       console.log(error);
//       console.log(paymentIntent);

//       if (error) {
//         event.complete("fail");
//         alert(error.message);
//       } else if (paymentIntent.status === "succeeded") {
//         event.complete("success");
//         alert("✅ Payment successful!");
//         router.push(`/success?session_id=${paymentIntent.id}&amount=${amount}`);
//       }
//     });
//   }, [stripe]);

//   if (!ready || !paymentRequest)
//     return <button disabled>Apple Pay unavailable</button>;

//   return (
//     <div className="w-96">
//       <PaymentRequestButtonElement
//         options={{
//           paymentRequest,
//           style: {
//             paymentRequestButton: {
//               type: "buy",
//               theme: "dark",
//               height: "48px",
//             },
//           },
//         }}
//       />
//     </div>
//   );
// }
