import type { Metadata } from "next";
import Link from "next/link";

// Third-party imports
import { MoveLeft } from "lucide-react";

// Local imports
import { PolicyBanner } from "@/components/banners/policy-banner";
import Footer from "@/components/shared/footer";
import { NavbarShell } from "@/components/shared/navbar-shell";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export const metadata: Metadata = {
  title: "Tipmanna TV app for Android TV — Service Terms and Conditions",
  description:
    "Additional terms and conditions for using the Tipmanna TV app on Android TV and Google TV devices.",
};

const linkClass = "text-primary underline underline-offset-2";

export default function AndroidTvServiceTerms() {
  return (
    <>
      <NavbarShell />

      <PolicyBanner title="Tipmanna TV App Service Terms" />

      <section className="section mini-wrapper">
        <Link
          href={LEGAL_ROUTES.serviceTerms}
          className="text-primary open_sans mb-4 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
        >
          <MoveLeft
            aria-hidden
            className="size-4"
          />
          Back to the Tipmanna Service Terms and Conditions
        </Link>

        <div className="space-y-2">
          <Paragraph size="sm">
            <strong>Last updated: 21 November 2026</strong>
          </Paragraph>
          <Paragraph size="sm">
            These Tipmanna TV App Service Terms (the &quot;TV Terms&quot;) apply
            when you install or use the Tipmanna TV app on an Android TV, Google
            TV or other supported television device (the &quot;TV App&quot;).
          </Paragraph>
          <Paragraph size="sm">
            The TV Terms are in addition to the{" "}
            <Link
              href={LEGAL_ROUTES.serviceTerms}
              className={linkClass}
            >
              Tipmanna Service Terms and Conditions
            </Link>
            , which also apply to your use of the TV App. If there is a
            conflict, the TV Terms apply to the extent of that conflict. How we
            handle personal information is explained in the{" "}
            <Link
              href={LEGAL_ROUTES.privacyPolicy}
              className={linkClass}
            >
              Tipmanna Privacy Policy
            </Link>
            .
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            1. ABOUT THE TV APP
          </Title>
          <Paragraph size="sm">The TV App lets you:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Watch Tipmanna TV, Community TV and scheduled programmes;</li>
            <li>Explore creators, hosts, channels and videos;</li>
            <li>
              Watch live and on-demand content published by creators and hosts;
            </li>
            <li>Sign in to your Tipmanna tipper account;</li>
            <li>Send tips to creators and hosts; and</li>
            <li>
              Report content or hosts and block hosts you do not want to see.
            </li>
          </ul>
          <Paragraph size="sm">
            The TV App is for watching and interacting with content. You cannot
            upload or publish content from the TV App; creators and hosts
            publish using the Tipmanna website.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            2. DEVICES AND DOWNLOADS
          </Title>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>
              The TV App is distributed through Google Play. Google&apos;s terms
              apply to your download and to your use of Google Play, and Google
              is not responsible for the TV App or these TV Terms.
            </li>
            <li>
              You need a compatible device, a supported operating system version
              and an internet connection. Data charges from your internet
              provider may apply.
            </li>
            <li>
              We may release updates. Some features may not work until you
              install the latest version.
            </li>
            <li>
              We give you a personal, non-exclusive, non-transferable and
              revocable licence to install and use the TV App on devices you own
              or control, for your personal, non-commercial use.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            3. SHARED SCREENS AND HOUSEHOLDS
          </Title>
          <Paragraph size="sm">
            Televisions are often shared. If you sign in on a TV, anyone using
            that TV may be able to see your account and act on your behalf,
            including sending tips. You are responsible for activity on your
            account on devices where you are signed in. Sign out of the TV App
            if other people use the device and you do not want them to use your
            account.
          </Paragraph>
          <Paragraph size="sm">
            Content on Tipmanna is published by creators and hosts. Account
            holders are responsible for deciding what is suitable for others,
            including children, who watch on a shared screen.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            4. TIPPING FROM THE TV
          </Title>
          <Paragraph size="sm">
            Where tipping is available in the TV App, you may be able to tip
            using your Tipmanna wallet or by scanning a QR code with your phone
            and completing payment there.
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>
              Check the amount and recipient shown on the TV and on your phone
              before you confirm.
            </li>
            <li>
              Payments are processed by our payment providers, including Stripe,
              and are subject to the tips and payments section of the{" "}
              <Link
                href={LEGAL_ROUTES.serviceTerms}
                className={linkClass}
              >
                Service Terms and Conditions
              </Link>
              .
            </li>
            <li>
              Only scan QR codes displayed by the TV App on a screen you trust.
              Tipmanna will never ask you to enter your password on a TV.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            5. REPORTING AND BLOCKING
          </Title>
          <Paragraph size="sm">
            You can report a video or host from the TV App if you believe it
            breaks the{" "}
            <Link
              href={LEGAL_ROUTES.serviceTerms}
              className={linkClass}
            >
              Service Terms and Conditions
            </Link>
            . Reports are reviewed by Tipmanna and handled in line with the
            reporting and moderation section of those terms. Do not make false
            or abusive reports.
          </Paragraph>
          <Paragraph size="sm">
            When you are signed in, you can block a host so that their content
            no longer appears in your schedule and explore feeds. You can
            unblock hosts from the TV App at any time. Blocking does not delete
            the host&apos;s content from Tipmanna.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            6. YOUR ACCOUNT AND DELETION
          </Title>
          <Paragraph size="sm">
            You can sign out of the TV App at any time. To delete your Tipmanna
            account, sign in on the Tipmanna website and use the account
            deletion option in your profile. Uninstalling the TV App does not
            delete your account. Section 21 of the{" "}
            <Link
              href={LEGAL_ROUTES.privacyPolicy}
              className={linkClass}
            >
              Privacy Policy
            </Link>{" "}
            explains what happens to your information when your account is
            deleted.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            7. AVAILABILITY
          </Title>
          <Paragraph size="sm">
            Content available in the TV App depends on what creators and hosts
            publish and may vary by device, region or time. Live programmes may
            start late, end early or be cancelled by their hosts. We may change
            or withdraw TV App features, or stop supporting particular devices
            or operating system versions, where reasonably necessary.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            8. CHANGES TO THESE TV TERMS
          </Title>
          <Paragraph size="sm">
            We may update these TV Terms as the TV App develops or where the law
            requires. Where changes are significant, we will give you reasonable
            notice. The latest revision date appears at the top of these TV
            Terms.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            9. CONTACT US
          </Title>
          <Paragraph size="sm">
            Questions about the TV App or these TV Terms can be sent to:
          </Paragraph>
          <Paragraph size="sm">
            <strong>Tipmanna Limited</strong>
            <br />
            20 Coombe Road
            <br />
            Birmingham
            <br />
            United Kingdom
          </Paragraph>
          <Paragraph size="sm">
            <strong>Email</strong>:{" "}
            <a href="mailto:hello@tipmanna.tv">hello@tipmanna.tv</a>
          </Paragraph>
          <Paragraph size="sm">
            <strong>Last updated</strong>: 21 November 2026
          </Paragraph>
        </div>
      </section>

      <Footer />
    </>
  );
}
