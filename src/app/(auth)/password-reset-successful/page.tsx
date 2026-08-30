"use client";

import Link from "next/link";
import Image from "next/image";

// Third-party imports
import { MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";

export default function PasswordResetSuccessfulPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <Link
        href="/forgot-password"
        className="hover:bg-secondary absolute top-4 left-4 flex w-fit gap-2 rounded-full px-4 py-2 text-base sm:top-8 sm:left-8 sm:text-lg"
      >
        <MoveLeft /> Back
      </Link>

      <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-6 p-4">
        <h1 className="racing_sans_one text-center text-3xl sm:text-5xl">
          Password successfully reset
        </h1>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
        >
          Your password has been successfully reset.
        </Paragraph>

        <Image
          src="/assets/star.png"
          alt="Star"
          width={100}
          height={100}
          className="size-40 object-cover"
        />

        <Link
          href="/sign-in"
          className="w-full"
        >
          <Button
            size="lg"
            className="w-full"
          >
            Back to sign in
          </Button>
        </Link>
      </div>
    </div>
  );
}
