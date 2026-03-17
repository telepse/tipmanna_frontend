// // "use client";

// // import { useEffect } from "react";

// // import { useMemo, useState } from "react";
// // import Image from "next/image";

// // // Third-party imports
// // import {
// //   Drawer,
// //   DrawerContent,
// //   DrawerHeader,
// //   DrawerTitle,
// // } from "@/components/ui/drawer";
// // import { ArrowLeft } from "lucide-react";
// // import { useDispatch, useSelector } from "react-redux";
// // import { RootState } from "@/redux/store";
// // import { toast } from "sonner";
// // import {
// //   createCheckoutSessionAction,
// //   createPaymentIntentAction,
// // } from "@/actions/payments";
// // import { setSelectedTips } from "@/features/tip-slice";
// // import { createVisitorTipperAction } from "@/actions/visitors";
// // import { setCredentials } from "@/features/auth-slice";
// // import Cookies from "js-cookie";
// // import { loadStripe } from "@stripe/stripe-js";
// // import { Elements } from "@stripe/react-stripe-js";
// // import PaymentRequestButton from "./payment-request-button";

// // const tips = [
// //   { emoji: "🌹", label: "Rose", price: 20 },
// //   { emoji: "🎭", label: "Comedy Mask", price: 30 },
// //   { emoji: "⭐", label: "Star", price: 50 },
// //   { emoji: "❤️", label: "Love", price: 70 },
// //   { emoji: "💬", label: "Add Text", price: 90, isText: true },
// // ];

// // const stripePromise = loadStripe(
// //   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
// // );

// // interface Character {
// //   id: string;
// //   name: string;
// //   iconUrl: string;
// //   price: number;
// // }

// // export const TipDrawer = ({
// //   open,
// //   onOpenChange,
// //   eventId,
// //   tippingCharacters,
// // }: {
// //   open: boolean;
// //   onOpenChange: (v: boolean) => void;
// //   eventId?: string;
// //   tippingCharacters: Character[];
// // }) => {
// //   console.log(tippingCharacters);

// //   const [textTipActive, setTextTipActive] = useState(false);
// //   const [textTipValue, setTextTipValue] = useState("");
// //   // const [selectedTips, setSelectedTips] = useState<string[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const [clientSecret, setClientSecret] = useState<string | null>(null);

// //   const user = useSelector((state: RootState) => state.auth.user);
// //   let userId = user?.id;

// //   const dispatch = useDispatch();
// //   const { selectedTips } = useSelector((state: RootState) => state.tip);

// //   const role = user?.role;

// //   // Allow selecting a tip multiple times and removing one at a time
// //   const toggleTip = (label: string) => {
// //     if (label === "Text") {
// //       setTextTipActive(true);
// //       if (!selectedTips.includes("Text")) {
// //         dispatch(setSelectedTips([...selectedTips, "Text"]));
// //       }
// //       return;
// //     }

// //     // ✅ Allow duplicates (for incrementing count)
// //     dispatch(setSelectedTips([...selectedTips, label]));
// //   };

// //   // ✅ Remove all of a specific tip type (reset count for that tip)
// //   const removeAllOfTip = (label: string) => {
// //     const updated = selectedTips.filter(l => l !== label);
// //     dispatch(setSelectedTips(updated));
// //     if (label === "Text") setTextTipActive(false);
// //   };

// //   // Calculate total amount based on all selected tips
// //   const totalAmount = useMemo(() => {
// //     // Always add £90 if textTipActive is true
// //     let sum = selectedTips
// //       .filter(label => label !== "Text")
// //       .reduce((acc, label) => {
// //         const tip = tips.find(t => t.label === label);
// //         return acc + (Number(tip?.price) || 0);
// //       }, 0);
// //     if (textTipActive) {
// //       sum += 90;
// //     }
// //     return sum;
// //   }, [selectedTips, textTipActive]);

// //   // Inside TipDrawer, after totalAmount calculation
// //   const characters = useMemo(() => {
// //     const tipTotals: Record<string, number> = {};
// //     selectedTips
// //       .filter(label => label !== "Text")
// //       .forEach(label => {
// //         const tip = tips.find(t => t.label === label);
// //         const price = tip?.price || 0;
// //         tipTotals[label] = (tipTotals[label] || 0) + price;
// //       });

// //     const chars = Object.entries(tipTotals).map(([label, totalPrice]) => ({
// //       name: label,
// //       price: totalPrice,
// //       time: new Date().toLocaleTimeString([], {
// //         hour: "2-digit",
// //         minute: "2-digit",
// //       }),
// //     }));

// //     if (textTipActive) {
// //       chars.push({
// //         name: "Add Text",
// //         price: 90,
// //         time: new Date().toLocaleTimeString([], {
// //           hour: "2-digit",
// //           minute: "2-digit",
// //         }),
// //       });
// //     }

// //     return chars;
// //   }, [selectedTips, textTipActive]);

// //   // Save totalAmount to localStorage whenever it changes, always reflecting text tip if active or if 'Text' is in selectedTips
// //   useEffect(() => {
// //     let amount = selectedTips.reduce((acc, label) => {
// //       if (label === "Text") {
// //         return acc + 90;
// //       }
// //       const tip = tips.find(t => t.label === label);
// //       return acc + (Number(tip?.price) || 0);
// //     }, 0);
// //     // If textTipActive but 'Text' not in selectedTips, add its value
// //     if (textTipActive && !selectedTips.includes("Text")) {
// //       amount += 90;
// //     }
// //     localStorage.setItem("amount", amount.toString());
// //   }, [totalAmount, textTipActive, selectedTips]);

// //   // Save textTipValue to localStorage whenever it changes
// //   useEffect(() => {
// //     if (textTipActive && textTipValue) {
// //       localStorage.setItem("textTipValue", textTipValue);
// //     }
// //   }, [textTipValue, textTipActive]);

// //   const handleCheckout = async () => {
// //     if (!eventId) {
// //       return toast.error("Event ID missing, cannot proceed with payment.");
// //     }

// //     if (totalAmount <= 0) {
// //       return toast.error("Please select at least one tip.");
// //     }

// //     const role = user?.role || "VISITOR";

// //     // 🧮 Aggregate duplicates: sum up total price per label
// //     const tipTotals: Record<string, number> = {};
// //     selectedTips
// //       .filter(label => label !== "Text")
// //       .forEach(label => {
// //         const tip = tips.find(t => t.label === label);
// //         const price = tip?.price || 0;
// //         tipTotals[label] = (tipTotals[label] || 0) + price;
// //       });

// //     // 🧾 Prepare final characters array with simple names and aggregated prices
// //     const characters = Object.entries(tipTotals).map(([label, totalPrice]) => ({
// //       name: label,
// //       price: totalPrice,
// //       time: new Date().toLocaleTimeString([], {
// //         hour: "2-digit",
// //         minute: "2-digit",
// //       }),
// //     }));

// //     // ✅ Include text tip if active (always named "Add Text")
// //     if (textTipActive) {
// //       characters.push({
// //         name: "Add Text",
// //         price: 90,
// //         time: new Date().toLocaleTimeString([], {
// //           hour: "2-digit",
// //           minute: "2-digit",
// //         }),
// //       });

// //       if (textTipValue) {
// //         localStorage.setItem("textTipValue", textTipValue);
// //       }
// //     }

// //     try {
// //       setLoading(true);

// //       // Create visitor if not logged in
// //       if (!userId) {
// //         const response = await createVisitorTipperAction();
// //         console.log(response);

// //         const { id, fullName, username, email } = response.visitor;

// //         dispatch(
// //           setCredentials({
// //             user: { id, fullName, username, email, role: "VISITOR" },
// //             token: response.token,
// //           })
// //         );

// //         Cookies.set("token", response.token, { expires: 1 });
// //         Cookies.set(
// //           "user",
// //           JSON.stringify({ id, fullName, username, email, role: "VISITOR" })
// //         );

// //         userId = id;
// //       }

// //       const data = await createCheckoutSessionAction({
// //         amount: totalAmount,
// //         eventId,
// //         userId,
// //         role,
// //         characters,
// //       });
// //       console.log(data);

// //       if (!data?.url) throw new Error("No Stripe URL returned from backend");

// //       window.location.href = data.url;
// //     } catch (err) {
// //       console.error("Checkout error:", err);
// //       toast.error("Failed to create checkout session");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     const fetchClientSecret = async () => {
// //       if (!totalAmount || totalAmount <= 0 || !eventId) return;

// //       try {
// //         const data = await createPaymentIntentAction({
// //           amount: totalAmount,
// //           currency: "gbp",
// //           eventId,
// //           userId,
// //           role,
// //           characters,
// //         });

// //         if (data?.clientSecret) {
// //           setClientSecret(data.clientSecret);
// //         } else {
// //           console.error("Failed to create PaymentIntent:", data.message);
// //         }
// //       } catch (err) {
// //         console.error("Error creating PaymentIntent:", err);
// //       }
// //     };

// //     fetchClientSecret();
// //   }, [totalAmount, eventId, userId, role, characters]);

// //   console.log(clientSecret);

// //   return (
// //     <Drawer
// //       open={open}
// //       onOpenChange={onOpenChange}
// //     >
// //       <DrawerContent className="bg-card space-y-2 border p-6 shadow-sm">
// //         <div className="flex justify-between gap-4 border p-2">
// //           <div className="bg-secondary/20 text-primary flex flex-col items-center justify-center rounded-md px-6 py-2 font-semibold">
// //             £{totalAmount}
// //           </div>

// //           {/* 🟩 Selected tips — left: text input if active, right: selected tips */}
// //           <div
// //             className={`flex flex-1 items-center gap-2 overflow-x-auto rounded-md border p-2 text-sm`}
// //           >
// //             {/* Text tip input on the left if active */}
// //             {textTipActive && (
// //               <input
// //                 type="text"
// //                 className="mr-2 rounded-md border border-orange-500 px-2 py-1 text-black"
// //                 placeholder="Type your text..."
// //                 value={textTipValue}
// //                 onChange={e => setTextTipValue(e.target.value)}
// //                 autoFocus
// //                 maxLength={15}
// //               />
// //             )}
// //             {/* Show selected tips as badge pills, no counters here */}
// //             <div className="flex flex-1 flex-row-reverse gap-2">
// //               {(selectedTips.includes("Text") || textTipActive) && (
// //                 <span
// //                   key="Text"
// //                   className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
// //                 >
// //                   Text
// //                   <button
// //                     type="button"
// //                     className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
// //                     onClick={() => removeAllOfTip("Text")}
// //                     aria-label="Remove all Text"
// //                   >
// //                     x
// //                   </button>
// //                 </span>
// //               )}
// //               {selectedTips.length > 0 &&
// //                 Array.from(new Set(selectedTips))
// //                   .filter(label => label !== "Text")
// //                   .map(label => {
// //                     const displayLabel =
// //                       label === "Comedy Mask" ? "Mask" : label;
// //                     return (
// //                       <span
// //                         key={label}
// //                         className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
// //                       >
// //                         {displayLabel}
// //                         <button
// //                           type="button"
// //                           className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
// //                           onClick={() => removeAllOfTip(label)}
// //                           aria-label={`Remove all ${displayLabel}`}
// //                         >
// //                           x
// //                         </button>
// //                       </span>
// //                     );
// //                   })}
// //               {selectedTips.length === 0 && !textTipActive && (
// //                 <span className="text-muted-foreground text-xs"></span>
// //               )}
// //             </div>
// //           </div>
// //         </div>

// //         <DrawerHeader>
// //           <DrawerTitle className="text-left text-xl">Select tips</DrawerTitle>
// //         </DrawerHeader>

// //         {/* Tip list – horizontally scrollable, two rows */}
// //         <div className="relative w-full overflow-x-auto scroll-smooth pb-2">
// //           {/* The wrapper flex container allows horizontal scroll */}
// //           <div
// //             className="flex min-w-max flex-wrap content-start gap-4 px-1"
// //             style={{
// //               rowGap: "1rem", // keeps clean vertical spacing
// //               maxHeight: "max-content",
// //             }}
// //           >
// //             {tips.map(tip => {
// //               const count = selectedTips.filter(l => l === tip.label).length;
// //               if (tip.isText) {
// //                 // Text tip should never show a count > 1
// //                 return (
// //                   <div
// //                     key={tip.label}
// //                     onClick={() => {
// //                       setTextTipActive(true);
// //                       // Always dispatch 'Text' to selectedTips if not present
// //                       if (!selectedTips.includes("Text")) {
// //                         dispatch(setSelectedTips([...selectedTips, "Text"]));
// //                       }
// //                     }}
// //                     className={`relative flex min-w-[130px] cursor-pointer flex-col items-center justify-center rounded-lg border border-gray-200 p-4 transition-all hover:bg-gray-50 sm:min-w-[150px] sm:p-6`}
// //                   >
// //                     {/* Always show a badge with 1 if active or selected */}
// //                     {(textTipActive || selectedTips.includes("Text")) && (
// //                       <div className="absolute top-0 right-0 rounded-full bg-black px-2 py-1 text-xs font-bold text-white">
// //                         1
// //                       </div>
// //                     )}
// //                     <span className="text-3xl">{tip.emoji}</span>
// //                     <h5 className="text-center text-sm font-medium whitespace-nowrap sm:text-lg">
// //                       {tip.label}
// //                     </h5>
// //                     <p className="text-muted-foreground text-xs sm:text-sm">
// //                       £90
// //                     </p>
// //                   </div>
// //                 );
// //               }
// //               return (
// //                 <div
// //                   key={tip.label}
// //                   onClick={() => toggleTip(tip.label)}
// //                   className={`relative flex min-w-[130px] cursor-pointer flex-col items-center justify-center rounded-lg border p-4 transition-all hover:bg-gray-50 sm:min-w-[150px] sm:p-6 ${
// //                     count > 0 ? "" : "border-gray-200"
// //                   }`}
// //                 >
// //                   {/* Show count badge if selected */}
// //                   {count > 0 && (
// //                     <div className="absolute top-0 right-0 rounded-full bg-black px-2 py-1 text-xs font-bold text-white">
// //                       {count}
// //                     </div>
// //                   )}
// //                   <span className="text-3xl">{tip.emoji}</span>
// //                   <h5 className="text-center text-sm font-medium whitespace-nowrap sm:text-lg">
// //                     {tip.label}
// //                   </h5>
// //                   <p className="text-muted-foreground text-xs sm:text-sm">
// //                     £{tip.price}
// //                   </p>
// //                 </div>
// //               );
// //             })}
// //           </div>

// //           {/* Optional scroll indicator bar */}
// //           <div className="absolute right-0 bottom-0 left-0 mt-1 h-1 rounded-full bg-orange-500 sm:hidden" />
// //         </div>

// //         {/* Payment section */}
// //         <div className="mt-6 flex items-center justify-between border-t pt-4">
// //           <div className="flex items-center gap-2">
// //             <div className="open_sans flex items-center rounded-md border border-gray-300 p-2 text-sm">
// //               Saved card
// //             </div>
// //             {/* <Elements stripe={stripePromise}>
// //               <PaymentRequestButton
// //                 amount={totalAmount}
// //                 currency="gbp"
// //                 eventId={eventId!}
// //                 userId={userId!}
// //                 role={role!}
// //                 characters={characters}
// //               />
// //             </Elements> */}
// //             {/* {!clientSecret ? (
// //       <p>Loading payment options…</p>
// //     ) : (
// //       <Elements stripe={stripePromise} options={{ clientSecret }}>
// //         <ExpressCheckout clientSecret={clientSecret} />
// //       </Elements>
// //     )} */}
// //             <div
// //               className="open_sans flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 p-2 text-sm"
// //               onClick={handleCheckout}
// //             >
// //               <Image
// //                 src="/apple.svg"
// //                 alt="Apple"
// //                 width={20}
// //                 height={20}
// //               />{" "}
// //               Pay
// //             </div>
// //             <div
// //               className="open_sans flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 p-2 text-sm"
// //               onClick={handleCheckout}
// //             >
// //               Pay with
// //               <Image
// //                 src="/logos/stripe-link.png"
// //                 alt="Stripe link"
// //                 width={50}
// //                 height={20}
// //                 className="h-8 w-10 object-cover"
// //               />{" "}
// //               {loading ? "..." : ""}
// //             </div>
// //           </div>

// //           <div className="flex items-center gap-2 font-medium">
// //             <div className="bg-secondary rounded-full p-1">
// //               <ArrowLeft />
// //             </div>{" "}
// //             Select payment
// //           </div>
// //         </div>
// //       </DrawerContent>
// //     </Drawer>
// //   );
// // };

// "use client";

// import { useEffect } from "react";
// import { useMemo, useState } from "react";
// import Image from "next/image";

// import {
//   Drawer,
//   DrawerContent,
//   DrawerHeader,
//   DrawerTitle,
// } from "@/components/ui/drawer";
// import { ArrowLeft } from "lucide-react";
// import { useDispatch, useSelector } from "react-redux";
// import { RootState } from "@/redux/store";
// import { toast } from "sonner";
// import {
//   createCheckoutSessionAction,
//   createPaymentIntentAction,
// } from "@/actions/payments";
// import { setSelectedTips } from "@/features/tip-slice";
// import { createVisitorTipperAction } from "@/actions/visitors";
// import { setCredentials } from "@/features/auth-slice";
// import Cookies from "js-cookie";
// import { loadStripe } from "@stripe/stripe-js";
// import { Elements } from "@stripe/react-stripe-js";
// // import PaymentRequestButton from "./payment-request-button";

// const stripePromise = loadStripe(
//   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
// );

// interface Character {
//   id: string;
//   name: string;
//   iconUrl: string;
//   price: number;
// }

// export const TipDrawer = ({
//   open,
//   onOpenChange,
//   eventId,
//   tippingCharacters = [],
// }: {
//   open: boolean;
//   onOpenChange: (v: boolean) => void;
//   eventId?: string;
//   tippingCharacters: Character[];
// }) => {
//   const [textTipActive, setTextTipActive] = useState(false);
//   const [textTipValue, setTextTipValue] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [clientSecret, setClientSecret] = useState<string | null>(null);

//   const user = useSelector((state: RootState) => state.auth.user);
//   let userId = user?.id;

//   const dispatch = useDispatch();
//   const { selectedTips } = useSelector((state: RootState) => state.tip);

//   const role = user?.role;

//   const textTipCharacter: Character = {
//     id: 'text-tip',
//     name: 'Add Text',
//     iconUrl: '/text-tip-icon.png',
//     price: 90,
//   };

//   const allTips = useMemo(() => {
//     return [...tippingCharacters, textTipCharacter];
//   }, [tippingCharacters]);

//   const toggleTip = (characterId: string) => {
//     if (characterId === 'text-tip') {
//       setTextTipActive(true);
//       if (!selectedTips.includes('text-tip')) {
//         dispatch(setSelectedTips([...selectedTips, 'text-tip']));
//       }
//       return;
//     }

//     dispatch(setSelectedTips([...selectedTips, characterId]));
//   };

//   const removeAllOfTip = (characterId: string) => {
//     const updated = selectedTips.filter(id => id !== characterId);
//     dispatch(setSelectedTips(updated));
//     if (characterId === 'text-tip') setTextTipActive(false);
//   };

//   const totalAmount = useMemo(() => {
//     return selectedTips.reduce((acc, characterId) => {
//       if (characterId === 'text-tip') {
//         return acc + 90;
//       }
//       const character = tippingCharacters.find(c => c.id === characterId);
//       return acc + (character?.price || 0);
//     }, 0);
//   }, [selectedTips, tippingCharacters]);

//   const characters = useMemo(() => {
//     const characterCounts: Record<string, number> = {};

//     selectedTips
//       .filter(id => id !== 'text-tip')
//       .forEach(characterId => {
//         characterCounts[characterId] = (characterCounts[characterId] || 0) + 1;
//       });

//     const chars = Object.entries(characterCounts).map(([characterId, count]) => {
//       const character = tippingCharacters.find(c => c.id === characterId);
//       return {
//         name: character?.name || 'Unknown',
//         price: (character?.price || 0) * count,
//         time: new Date().toLocaleTimeString([], {
//           hour: "2-digit",
//           minute: "2-digit",
//         }),
//         characterId,
//       };
//     });

//     if (textTipActive || selectedTips.includes('text-tip')) {
//       chars.push({
//         name: 'Add Text',
//         price: 90,
//         time: new Date().toLocaleTimeString([], {
//           hour: "2-digit",
//           minute: "2-digit",
//         }),
//         characterId: 'text-tip',
//       });
//     }

//     return chars;
//   }, [selectedTips, textTipActive, tippingCharacters]);

//   useEffect(() => {
//     const amount = selectedTips.reduce((acc, characterId) => {
//       if (characterId === 'text-tip') {
//         return acc + 90;
//       }
//       const character = tippingCharacters.find(c => c.id === characterId);
//       return acc + (character?.price || 0);
//     }, 0);

//     localStorage.setItem("amount", amount.toString());
//   }, [totalAmount, textTipActive, selectedTips, tippingCharacters]);

//   useEffect(() => {
//     if (textTipActive && textTipValue) {
//       localStorage.setItem("textTipValue", textTipValue);
//     }
//   }, [textTipValue, textTipActive]);

//   const getCharacterById = (characterId: string) => {
//     if (characterId === 'text-tip') return textTipCharacter;
//     return tippingCharacters.find(c => c.id === characterId);
//   };

//   const getSelectedCount = (characterId: string) => {
//     return selectedTips.filter(id => id === characterId).length;
//   };

//   const handleCheckout = async () => {
//     if (!eventId) {
//       return toast.error("Event ID missing, cannot proceed with payment.");
//     }

//     if (totalAmount <= 0) {
//       return toast.error("Please select at least one tip.");
//     }

//     const userRole = user?.role || "VISITOR";

//     const tipTotals: Record<string, number> = {};
//     selectedTips
//       .filter(characterId => characterId !== 'text-tip')
//       .forEach(characterId => {
//         const character = tippingCharacters.find(c => c.id === characterId);
//         const price = character?.price || 0;
//         tipTotals[characterId] = (tipTotals[characterId] || 0) + price;
//       });

//     const checkoutChars = Object.entries(tipTotals).map(([characterId, totalPrice]) => {
//       const character = tippingCharacters.find(c => c.id === characterId);
//       return {
//         name: character?.name || 'Unknown',
//         price: totalPrice,
//         time: new Date().toLocaleTimeString([], {
//           hour: "2-digit",
//           minute: "2-digit",
//         }),
//         characterId,
//       };
//     });

//     if (textTipActive) {
//       checkoutChars.push({
//         name: 'Add Text',
//         price: 90,
//         time: new Date().toLocaleTimeString([], {
//           hour: "2-digit",
//           minute: "2-digit",
//         }),
//         characterId: 'text-tip',
//       });

//       if (textTipValue) {
//         localStorage.setItem("textTipValue", textTipValue);
//       }
//     }

//     try {
//       setLoading(true);

//       if (!userId) {
//         const response = await createVisitorTipperAction();
//         console.log(response);

//         const { id, fullName, username, email } = response.visitor;

//         dispatch(
//           setCredentials({
//             user: { id, fullName, username, email, role: "VISITOR" },
//             token: response.token,
//           })
//         );

//         Cookies.set("token", response.token, { expires: 1 });
//         Cookies.set(
//           "user",
//           JSON.stringify({ id, fullName, username, email, role: "VISITOR" })
//         );

//         userId = id;
//       }

//       const data = await createCheckoutSessionAction({
//         amount: totalAmount,
//         eventId,
//         userId,
//         role: userRole,
//         characters: checkoutChars,
//       });
//       console.log(data);

//       if (!data?.url) throw new Error("No Stripe URL returned from backend");

//       window.location.href = data.url;
//     } catch (err) {
//       console.error("Checkout error:", err);
//       toast.error("Failed to create checkout session");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     const fetchClientSecret = async () => {
//       if (!totalAmount || totalAmount <= 0 || !eventId) return;

//       try {
//         const data = await createPaymentIntentAction({
//           amount: totalAmount,
//           currency: "gbp",
//           eventId,
//           userId,
//           role,
//           characters,
//         });

//         if (data?.clientSecret) {
//           setClientSecret(data.clientSecret);
//         } else {
//           console.error("Failed to create PaymentIntent:", data.message);
//         }
//       } catch (err) {
//         console.error("Error creating PaymentIntent:", err);
//       }
//     };

//     fetchClientSecret();
//   }, [totalAmount, eventId, userId, role, characters]);

//   return (
//     <Drawer
//       open={open}
//       onOpenChange={onOpenChange}
//     >
//       <DrawerContent className="bg-card space-y-2 border p-6 shadow-sm">
//         <div className="flex justify-between gap-4 border p-2">
//           <div className="bg-secondary/20 text-primary flex flex-col items-center justify-center rounded-md px-6 py-2 font-semibold">
//             £{totalAmount}
//           </div>

//           <div
//             className={`flex flex-1 items-center gap-2 overflow-x-auto rounded-md border p-2 text-sm`}
//           >
//             {textTipActive && (
//               <input
//                 type="text"
//                 className="mr-2 rounded-md border border-orange-500 px-2 py-1 text-black"
//                 placeholder="Type your text..."
//                 value={textTipValue}
//                 onChange={e => setTextTipValue(e.target.value)}
//                 autoFocus
//                 maxLength={15}
//               />
//             )}
//             <div className="flex flex-1 flex-row-reverse gap-2">
//               {(selectedTips.includes('text-tip') || textTipActive) && (
//                 <span
//                   key="text-tip"
//                   className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
//                 >
//                   Text
//                   <button
//                     type="button"
//                     className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
//                     onClick={() => removeAllOfTip('text-tip')}
//                     aria-label="Remove all Text"
//                   >
//                     x
//                   </button>
//                 </span>
//               )}
//               {selectedTips.length > 0 &&
//                 Array.from(new Set(selectedTips))
//                   .filter(characterId => characterId !== 'text-tip')
//                   .map(characterId => {
//                     const character = getCharacterById(characterId);
//                     if (!character) return null;

//                     return (
//                       <span
//                         key={characterId}
//                         className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
//                       >
//                         {character.name}
//                         <button
//                           type="button"
//                           className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
//                           onClick={() => removeAllOfTip(characterId)}
//                           aria-label={`Remove all ${character.name}`}
//                         >
//                           x
//                         </button>
//                       </span>
//                     );
//                   })}
//               {selectedTips.length === 0 && !textTipActive && (
//                 <span className="text-muted-foreground text-xs"></span>
//               )}
//             </div>
//           </div>
//         </div>

//         <DrawerHeader>
//           <DrawerTitle className="text-left text-xl">Select tips</DrawerTitle>
//         </DrawerHeader>

//         <div className="relative w-full overflow-x-auto scroll-smooth pb-2">
//           <div
//             className="flex min-w-max flex-wrap content-start gap-4 px-1"
//             style={{
//               rowGap: "1rem",
//               maxHeight: "max-content",
//             }}
//           >
//             {allTips.map(character => {
//               const count = getSelectedCount(character.id);
//               const isTextTip = character.id === 'text-tip';

//               return (
//                 <div
//                   key={character.id}
//                   onClick={() => toggleTip(character.id)}
//                   className={`relative flex min-w-[130px] cursor-pointer flex-col items-center justify-center rounded-lg border p-4 transition-all hover:bg-gray-50 sm:min-w-[150px] sm:p-6 ${
//                     count > 0 ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
//                   }`}
//                 >
//                   {count > 0 && (
//                     <div className="absolute top-0 right-0 rounded-full bg-black px-2 py-1 text-xs font-bold text-white">
//                       {count}
//                     </div>
//                   )}

//                   <div className="mb-2">
//                     {isTextTip ? (
//                       <span className="text-3xl">💬</span>
//                     ) : (
//                       <Image
//                         src={character.iconUrl}
//                         alt={character.name}
//                         width={40}
//                         height={40}
//                         className="size-10 object-contain"
//                       />
//                     )}
//                   </div>

//                   <h5 className="text-center text-sm font-medium whitespace-nowrap sm:text-lg">
//                     {character.name}
//                   </h5>
//                   <p className="text-muted-foreground text-xs sm:text-sm">
//                     £{character.price}
//                   </p>
//                 </div>
//               );
//             })}
//           </div>

//           <div className="absolute right-0 bottom-0 left-0 mt-1 h-1 rounded-full bg-orange-500 sm:hidden" />
//         </div>

//         <div className="mt-6 flex items-center justify-between border-t pt-4">
//           <div className="flex items-center gap-2">
//             <div className="open_sans flex items-center rounded-md border border-gray-300 p-2 text-sm">
//               Saved card
//             </div>
//             <div
//               className="open_sans flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 p-2 text-sm"
//               onClick={handleCheckout}
//             >
//               <Image
//                 src="/apple.svg"
//                 alt="Apple"
//                 width={20}
//                 height={20}
//               />{" "}
//               Pay
//             </div>
//             <div
//               className="open_sans flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 p-2 text-sm"
//               onClick={handleCheckout}
//             >
//               Pay with
//               <Image
//                 src="/logos/stripe-link.png"
//                 alt="Stripe link"
//                 width={50}
//                 height={20}
//                 className="h-8 w-10 object-cover"
//               />{" "}
//               {loading ? "..." : ""}
//             </div>
//           </div>

//           <div className="flex items-center gap-2 font-medium">
//             <div className="bg-secondary rounded-full p-1">
//               <ArrowLeft />
//             </div>{" "}
//             Select payment
//           </div>
//         </div>
//       </DrawerContent>
//     </Drawer>
//   );
// };

// // "use client";

// // import { useEffect } from "react";
// // import { useMemo, useState } from "react";
// // import Image from "next/image";

// // import {
// //   Drawer,
// //   DrawerContent,
// //   DrawerHeader,
// //   DrawerTitle,
// // } from "@/components/ui/drawer";
// // import { ArrowLeft } from "lucide-react";
// // import { useDispatch, useSelector } from "react-redux";
// // import { RootState } from "@/redux/store";
// // import { toast } from "sonner";
// // import {
// //   createCheckoutSessionAction,
// //   createPaymentIntentAction,
// // } from "@/actions/payments";
// // import { setSelectedTips } from "@/features/tip-slice";
// // import { createVisitorTipperAction } from "@/actions/visitors";
// // import { setCredentials } from "@/features/auth-slice";
// // import Cookies from "js-cookie";
// // import { loadStripe } from "@stripe/stripe-js";
// // import { Elements } from "@stripe/react-stripe-js";
// // import PaymentRequestButton from "./pr-button";

// // const stripePromise = loadStripe(
// //   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
// // );

// // interface Character {
// //   id: string;
// //   name: string;
// //   iconUrl: string;
// //   price: number;
// // }

// // export const TipDrawer = ({
// //   open,
// //   onOpenChange,
// //   eventId,
// //   tippingCharacters = [],
// // }: {
// //   open: boolean;
// //   onOpenChange: (v: boolean) => void;
// //   eventId?: string;
// //   tippingCharacters: Character[];
// // }) => {
// //   const [textTipActive, setTextTipActive] = useState(false);
// //   const [textTipValue, setTextTipValue] = useState("");
// //   const [loading, setLoading] = useState(false);
// //   const [clientSecret, setClientSecret] = useState<string | null>(null);

// //   const user = useSelector((state: RootState) => state.auth.user);
// //   let userId = user?.id;

// //   const dispatch = useDispatch();
// //   const { selectedTips } = useSelector((state: RootState) => state.tip);

// //   const role = user?.role;

// //   const textTipCharacter: Character = {
// //     id: 'text-tip',
// //     name: 'Add Text',
// //     iconUrl: '/text-tip-icon.png',
// //     price: 90,
// //   };

// //   const allTips = useMemo(() => {
// //     return [...tippingCharacters, textTipCharacter];
// //   }, [tippingCharacters]);

// //   const toggleTip = (characterId: string) => {
// //     if (characterId === 'text-tip') {
// //       setTextTipActive(true);
// //       if (!selectedTips.includes('Text')) {
// //         dispatch(setSelectedTips([...selectedTips, 'Text']));
// //       }
// //       return;
// //     }

// //     const character = tippingCharacters.find(c => c.id === characterId);
// //     if (character) {
// //       dispatch(setSelectedTips([...selectedTips, character.name]));
// //     }
// //   };

// //   const removeAllOfTip = (characterName: string) => {
// //     const updated = selectedTips.filter(name => name !== characterName);
// //     dispatch(setSelectedTips(updated));
// //     if (characterName === 'Text') setTextTipActive(false);
// //   };

// //   const totalAmount = useMemo(() => {
// //     return selectedTips.reduce((acc, characterName) => {
// //       if (characterName === 'Text') {
// //         return acc + 90;
// //       }
// //       const character = tippingCharacters.find(c => c.name === characterName);
// //       return acc + (character?.price || 0);
// //     }, 0);
// //   }, [selectedTips, tippingCharacters]);

// //   const characters = useMemo(() => {
// //     const characterCounts: Record<string, number> = {};

// //     selectedTips
// //       .filter(name => name !== 'Text')
// //       .forEach(characterName => {
// //         characterCounts[characterName] = (characterCounts[characterName] || 0) + 1;
// //       });

// //     const chars = Object.entries(characterCounts).map(([characterName, count]) => {
// //       const character = tippingCharacters.find(c => c.name === characterName);
// //       return {
// //         name: characterName,
// //         price: (character?.price || 0) * count,
// //         time: new Date().toLocaleTimeString([], {
// //           hour: "2-digit",
// //           minute: "2-digit",
// //         }),
// //         characterId: character?.id || characterName,
// //       };
// //     });

// //     if (textTipActive || selectedTips.includes('Text')) {
// //       chars.push({
// //         name: 'Add Text',
// //         price: 90,
// //         time: new Date().toLocaleTimeString([], {
// //           hour: "2-digit",
// //           minute: "2-digit",
// //         }),
// //         characterId: 'text-tip',
// //       });
// //     }

// //     return chars;
// //   }, [selectedTips, textTipActive, tippingCharacters]);

// //   useEffect(() => {
// //     const amount = selectedTips.reduce((acc, characterName) => {
// //       if (characterName === 'Text') {
// //         return acc + 90;
// //       }
// //       const character = tippingCharacters.find(c => c.name === characterName);
// //       return acc + (character?.price || 0);
// //     }, 0);

// //     localStorage.setItem("amount", amount.toString());
// //   }, [totalAmount, textTipActive, selectedTips, tippingCharacters]);

// //   useEffect(() => {
// //     if (textTipActive && textTipValue) {
// //       localStorage.setItem("textTipValue", textTipValue);
// //     }
// //   }, [textTipValue, textTipActive]);

// //   const getSelectedCount = (characterName: string) => {
// //     return selectedTips.filter(name => name === characterName).length;
// //   };

// //   const [paymentIntentData, setPaymentIntentData] = useState<{
// //     clientSecret: string;
// //     amount: number;
// //   } | null>(null);

// //   const handleExpressPaymentSuccess = () => {
// //     toast.success("Payment completed successfully!");
// //     // Reset selections
// //     dispatch(setSelectedTips([]));
// //     setTextTipActive(false);
// //     setTextTipValue("");
// //     onOpenChange(false);

// //     // You might want to refresh event data or show success message
// //   };

// //   const handleExpressPaymentError = (error: string) => {
// //     toast.error(`Payment failed: ${error}`);
// //   };

// //   const handleGooglePay = async () => {
// //     if (!totalAmount || totalAmount <= 0 || !eventId) {
// //       toast.error("Please select at least one tip.");
// //       return;
// //     }

// //     try {
// //       setLoading(true);

// //       // Create payment intent for express payment
// //       const data = await createPaymentIntentAction({
// //         amount: totalAmount,
// //         currency: "gbp",
// //         eventId,
// //         userId,
// //         role: user?.role || "VISITOR",
// //         characters,
// //       });

// //       if (data?.clientSecret) {
// //         setPaymentIntentData({
// //           clientSecret: data.clientSecret,
// //           amount: totalAmount,
// //         });
// //       } else {
// //         toast.error("Failed to initialize payment");
// //       }
// //     } catch (err) {
// //       console.error("Error initializing payment:", err);
// //       toast.error("Failed to initialize payment");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleCheckout = async () => {
// //     if (!eventId) {
// //       return toast.error("Event ID missing, cannot proceed with payment.");
// //     }

// //     if (totalAmount <= 0) {
// //       return toast.error("Please select at least one tip.");
// //     }

// //     const userRole = user?.role || "VISITOR";

// //     const tipTotals: Record<string, number> = {};
// //     selectedTips
// //       .filter(characterName => characterName !== 'Text')
// //       .forEach(characterName => {
// //         const character = tippingCharacters.find(c => c.name === characterName);
// //         const price = character?.price || 0;
// //         tipTotals[characterName] = (tipTotals[characterName] || 0) + price;
// //       });

// //     const checkoutChars = Object.entries(tipTotals).map(([characterName, totalPrice]) => {
// //       const character = tippingCharacters.find(c => c.name === characterName);
// //       return {
// //         name: characterName,
// //         price: totalPrice,
// //         time: new Date().toLocaleTimeString([], {
// //           hour: "2-digit",
// //           minute: "2-digit",
// //         }),
// //         characterId: character?.id || characterName,
// //       };
// //     });

// //     if (textTipActive) {
// //       checkoutChars.push({
// //         name: 'Add Text',
// //         price: 90,
// //         time: new Date().toLocaleTimeString([], {
// //           hour: "2-digit",
// //           minute: "2-digit",
// //         }),
// //         characterId: 'text-tip',
// //       });

// //       if (textTipValue) {
// //         localStorage.setItem("textTipValue", textTipValue);
// //       }
// //     }

// //     try {
// //       setLoading(true);

// //       if (!userId) {
// //         const response = await createVisitorTipperAction();
// //         console.log(response);

// //         const { id, fullName, username, email } = response.visitor;

// //         dispatch(
// //           setCredentials({
// //             user: { id, fullName, username, email, role: "VISITOR" },
// //             token: response.token,
// //           })
// //         );

// //         Cookies.set("token", response.token, { expires: 1 });
// //         Cookies.set(
// //           "user",
// //           JSON.stringify({ id, fullName, username, email, role: "VISITOR" })
// //         );

// //         userId = id;
// //       }

// //       const data = await createCheckoutSessionAction({
// //         amount: totalAmount,
// //         eventId,
// //         userId,
// //         role: userRole,
// //         characters: checkoutChars,
// //       });
// //       console.log(data);

// //       if (!data?.url) throw new Error("No Stripe URL returned from backend");

// //       window.location.href = data.url;
// //     } catch (err) {
// //       console.error("Checkout error:", err);
// //       toast.error("Failed to create checkout session");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   useEffect(() => {
// //     const fetchClientSecret = async () => {
// //       if (!totalAmount || totalAmount <= 0 || !eventId) return;

// //       try {
// //         const data = await createPaymentIntentAction({
// //           amount: totalAmount,
// //           currency: "gbp",
// //           eventId,
// //           userId,
// //           role,
// //           characters,
// //         });

// //         if (data?.clientSecret) {
// //           setClientSecret(data.clientSecret);
// //         } else {
// //           console.error("Failed to create PaymentIntent:", data.message);
// //         }
// //       } catch (err) {
// //         console.error("Error creating PaymentIntent:", err);
// //       }
// //     };

// //     fetchClientSecret();
// //   }, [totalAmount, eventId, userId, role, characters]);

// //   console.log(clientSecret);

// //   return (
// //     <Drawer
// //       open={open}
// //       onOpenChange={onOpenChange}
// //     >
// //       <DrawerContent className="bg-card space-y-2 border p-6 shadow-sm">
// //         <div className="flex justify-between gap-4 border p-2">
// //           <div className="bg-secondary/20 text-primary flex flex-col items-center justify-center rounded-md px-6 py-2 font-semibold">
// //             £{totalAmount}
// //           </div>

// //           <div
// //             className={`flex flex-1 items-center gap-2 overflow-x-auto rounded-md border p-2 text-sm`}
// //           >
// //             {textTipActive && (
// //               <input
// //                 type="text"
// //                 className="mr-2 rounded-md border border-orange-500 px-2 py-1 text-black"
// //                 placeholder="Type your text..."
// //                 value={textTipValue}
// //                 onChange={e => setTextTipValue(e.target.value)}
// //                 autoFocus
// //                 maxLength={15}
// //               />
// //             )}
// //             <div className="flex flex-1 flex-row-reverse gap-2">
// //               {(selectedTips.includes('Text') || textTipActive) && (
// //                 <span
// //                   key="Text"
// //                   className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
// //                 >
// //                   Text
// //                   <button
// //                     type="button"
// //                     className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
// //                     onClick={() => removeAllOfTip('Text')}
// //                     aria-label="Remove all Text"
// //                   >
// //                     x
// //                   </button>
// //                 </span>
// //               )}
// //               {selectedTips.length > 0 &&
// //                 Array.from(new Set(selectedTips))
// //                   .filter(characterName => characterName !== 'Text')
// //                   .map(characterName => {
// //                     return (
// //                       <span
// //                         key={characterName}
// //                         className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
// //                       >
// //                         {characterName}
// //                         <button
// //                           type="button"
// //                           className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
// //                           onClick={() => removeAllOfTip(characterName)}
// //                           aria-label={`Remove all ${characterName}`}
// //                         >
// //                           x
// //                         </button>
// //                       </span>
// //                     );
// //                   })}
// //               {selectedTips.length === 0 && !textTipActive && (
// //                 <span className="text-muted-foreground text-xs"></span>
// //               )}
// //             </div>
// //           </div>
// //         </div>

// //         <DrawerHeader>
// //           <DrawerTitle className="text-left text-xl">Select tips</DrawerTitle>
// //         </DrawerHeader>

// //         <div className="relative w-full overflow-x-auto scroll-smooth pb-2">
// //           <div
// //             className="flex min-w-max flex-wrap content-start gap-4 px-1"
// //             style={{
// //               rowGap: "1rem",
// //               maxHeight: "max-content",
// //             }}
// //           >
// //             {allTips.map(character => {
// //               const characterName = character.id === 'text-tip' ? 'Text' : character.name;
// //               const count = getSelectedCount(characterName);
// //               const isTextTip = character.id === 'text-tip';

// //               return (
// //                 <div
// //                   key={character.id}
// //                   onClick={() => toggleTip(character.id)}
// //                   className={`relative flex min-w-[130px] cursor-pointer flex-col items-center justify-center rounded-lg border p-4 transition-all hover:bg-gray-50 sm:min-w-[150px] sm:p-6 ${
// //                     count > 0 ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
// //                   }`}
// //                 >
// //                   {count > 0 && (
// //                     <div className="absolute top-0 right-0 rounded-full bg-black px-2 py-1 text-xs font-bold text-white">
// //                       {count}
// //                     </div>
// //                   )}

// //                   <div className="mb-2">
// //                     {isTextTip ? (
// //                       <span className="text-3xl">💬</span>
// //                     ) : (
// //                       <Image
// //                         src={character.iconUrl}
// //                         alt={character.name}
// //                         width={40}
// //                         height={40}
// //                         className="size-10 object-contain"
// //                       />
// //                     )}
// //                   </div>

// //                   <h5 className="text-center text-sm font-medium whitespace-nowrap sm:text-lg">
// //                     {character.name}
// //                   </h5>
// //                   <p className="text-muted-foreground text-xs sm:text-sm">
// //                     £{character.price}
// //                   </p>
// //                 </div>
// //               );
// //             })}
// //           </div>

// //           <div className="absolute right-0 bottom-0 left-0 mt-1 h-1 rounded-full bg-orange-500 sm:hidden" />
// //         </div>

// //         <div className="mt-6 flex items-center justify-between border-t pt-4">
// //           <div className="flex items-center gap-2">
// //             <div className="open_sans flex items-center rounded-md border border-gray-300 p-2 text-sm">
// //               Saved card
// //             </div>
// //             <div
// //               className="open_sans flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 p-2 text-sm"
// //               onClick={handleCheckout}
// //             >
// //               <Image
// //                 src="/apple.svg"
// //                 alt="Apple"
// //                 width={20}
// //                 height={20}
// //               />{" "}
// //               Pay
// //             </div>
// //             {/* Google Pay Button */}
// //             <button
// //               className="open_sans flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 p-2 text-sm hover:bg-gray-50 transition-colors"
// //               onClick={handleGooglePay}
// //               disabled={loading || totalAmount <= 0}
// //             >
// //               <Image
// //                 src="/google.svg"
// //                 alt="Google Pay"
// //                 width={20}
// //                 height={20}
// //                 className="size-5 object-contain"
// //               />{" "}
// //               Pay
// //             </button>
// //             {/* Payment Request Button (for browsers that support it) */}
// //             {paymentIntentData && (
// //               <Elements stripe={stripePromise} options={{
// //                 clientSecret: paymentIntentData.clientSecret,
// //                 appearance: { theme: 'stripe' }
// //               }}>
// //                 <PaymentRequestButton
// //                   amount={paymentIntentData.amount}
// //                   currency="gbp"
// //                   eventId={eventId!}
// //                   userId={userId!}
// //                   role={user?.role || "VISITOR"}
// //                   characters={characters}
// //                   onSuccess={handleExpressPaymentSuccess}
// //                   onError={handleExpressPaymentError}
// //                 />
// //               </Elements>
// //             )}
// //             <div
// //               className="open_sans flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 p-2 text-sm"
// //               onClick={handleCheckout}
// //             >
// //               Pay with
// //               <Image
// //                 src="/logos/stripe-link.png"
// //                 alt="Stripe link"
// //                 width={50}
// //                 height={20}
// //                 className="h-8 w-10 object-cover"
// //               />{" "}
// //               {loading ? "..." : ""}
// //             </div>
// //           </div>

// //           <div className="flex items-center gap-2 font-medium">
// //             <div className="bg-secondary rounded-full p-1">
// //               <ArrowLeft />
// //             </div>{" "}
// //             Select payment
// //           </div>
// //         </div>
// //       </DrawerContent>
// //     </Drawer>
// //   );
// // };

// // components/events/tip-drawer.tsx
