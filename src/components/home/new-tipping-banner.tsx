"use client";

import Image from "next/image";

// Third-party imports
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";

export default function NewTippingBanner() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="wrapper px-4 py-12">
      <div className="flex flex-col items-center gap-8">
        <h2
          id="features-heading"
          className="w-full"
        >
          <Title
            align="center"
            size="lg"
          >
            Tip as you{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              enjoy
            </span>{" "}
          </Title>
        </h2>
        <Paragraph
          align="center"
          color="muted"
          className="-mt-2"
        >
          Watch. Participate. Then Support. <br /> That is the idea behind Tip
          as you enjoy.
        </Paragraph>
      </div>

      <section
        className="section relative mt-8 min-h-[60vh] rounded-2xl bg-cover bg-center bg-no-repeat bg-blend-multiply"
        // style={{ backgroundImage: `url(/patterns/tip_what_you_can.webp)` }}
      >
        <Image
          src="/patterns/tip_what_you_can.webp"
          fill
          alt=""
          aria-hidden
          priority={false}
        />
        <Button className="bricolage text-md absolute top-8 left-8 w-fit rounded-2xl bg-[#E6EFFE] px-4 py-8 font-semibold text-[#175CD3] shadow-[-5px_-5px_0px_rgba(23,92,211,0.5)] transition-all hover:translate-x-[5px] hover:translate-y-[5px] sm:text-4xl lg:left-24">
          Live comments
        </Button>

        <div className="absolute top-28 right-8 lg:top-18 lg:right-24">
          <Button className="bricolage text-md w-fit rounded-2xl bg-[#E6EFFE] px-4 py-8 font-semibold text-[#F57D11] shadow-[-5px_-5px_0px_rgba(245,125,17,0.5)] transition-all hover:translate-x-[5px] hover:translate-y-[5px] sm:text-4xl">
            Memberships
          </Button>{" "}
          <motion.div
            initial={{ y: 0 }}
            animate={shouldReduceMotion ? {} : { y: [-5, 0, -5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8"
          >
            <Image
              src="/vectors/bolt_right.webp"
              alt="Bolt right"
              width={50}
              height={50}
              className="size-10 drop-shadow-[5px_5px_0px_black] sm:size-12"
            />
          </motion.div>
        </div>

        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <Button className="bricolage text-md w-fit rounded-2xl bg-[#E6EFFE] px-4 py-8 font-semibold text-[#00AD6C] shadow-[-5px_-5px_0px_rgba(0,173,108,0.5)] sm:text-4xl">
            Tips and paid engagement
          </Button>{" "}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-5, 0, -5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="absolute -top-4 left-0 sm:-top-8 sm:-right-16"
          >
            <Image
              src="/vectors/bolt_right.webp"
              alt="Bolt right"
              width={50}
              height={50}
              className="size-10 drop-shadow-[5px_5px_0px_black] sm:size-12"
            />
          </motion.div>
        </div>

        <Button className="bricolage text-md absolute bottom-8 left-1/2 w-fit -translate-x-1/2 rounded-2xl bg-[#E6EFFE] px-4 py-8 font-semibold text-[#3C7293] shadow-[-5px_-5px_0px_rgba(60,114,147,0.5)] transition-all hover:translate-x-[5px] hover:translate-y-[5px] sm:text-4xl">
          Live participation
        </Button>
      </section>
    </div>
  );
}
