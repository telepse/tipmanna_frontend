"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";
import { Badge } from "../shared/badge";

const labelClassName =
  "bricolage text-md w-fit rounded-2xl bg-[#E6EFFE] px-4 py-8 font-semibold shadow-[-5px_-5px_0px_rgba(0,0,0,0.15)] sm:text-4xl";

export default function NewTippingBanner() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="wrapper px-4 py-12">
      <div className="flex flex-col items-center gap-4">
        <div className="space-y-3">
          <Title
            id="tip-as-you-enjoy-heading"
            align="center"
            size="lg"
            className="w-full"
          >
            Tip as you{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              enjoy
            </span>
          </Title>
          <Paragraph
            align="center"
            className="leading-relaxed"
          >
            Watch. Participate. Then Support. <br /> That is the idea behind Tip
            as you enjoy.
          </Paragraph>
        </div>
      </div>

      <div className="mt-4">
        <Badge title="Ways people support" />
      </div>

      <section className="section relative mt-4 min-h-[55vh] rounded-2xl bg-cover bg-center bg-no-repeat bg-blend-multiply">
        <Image
          src="/patterns/tip_what_you_can.webp"
          fill
          alt=""
          aria-hidden
          sizes="(max-width: 1024px) 100vw, 1152px"
          className="object-cover"
        />
        <span
          className={`${labelClassName} absolute top-8 left-8 text-[#175CD3] shadow-[-5px_-5px_0px_rgba(23,92,211,0.5)] lg:left-24`}
        >
          Live comments
        </span>

        <div className="absolute top-28 right-8 lg:top-18 lg:right-24">
          <span
            className={`${labelClassName} text-[#F57D11] shadow-[-5px_-5px_0px_rgba(245,125,17,0.5)]`}
          >
            Memberships
          </span>
          <motion.div
            initial={{ y: 0 }}
            animate={shouldReduceMotion ? {} : { y: [-5, 0, -5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8"
          >
            <Image
              src="/vectors/bolt_right.webp"
              alt=""
              width={50}
              height={50}
              className="size-10 drop-shadow-[5px_5px_0px_black] sm:size-12"
              aria-hidden
            />
          </motion.div>
        </div>

        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <span
            className={`${labelClassName} text-[#00AD6C] shadow-[-5px_-5px_0px_rgba(0,173,108,0.5)]`}
          >
            Tips and paid engagement
          </span>
          <motion.div
            initial={{ y: 0 }}
            animate={shouldReduceMotion ? {} : { y: [-5, 0, -5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute -top-4 left-0 sm:-top-8 sm:-right-16"
          >
            <Image
              src="/vectors/bolt_right.webp"
              alt=""
              width={50}
              height={50}
              className="size-10 drop-shadow-[5px_5px_0px_black] sm:size-12"
              aria-hidden
            />
          </motion.div>
        </div>

        <span
          className={`${labelClassName} absolute bottom-8 left-1/2 -translate-x-1/2 text-[#3C7293] shadow-[-5px_-5px_0px_rgba(60,114,147,0.5)]`}
        >
          Live participation
        </span>
      </section>
    </div>
  );
}
