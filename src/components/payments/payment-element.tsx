"use client";

import { useState, useEffect } from "react";
import { useStripe } from "@stripe/react-stripe-js";

export const PaymentElement = () => {
  const stripe = useStripe();
};
