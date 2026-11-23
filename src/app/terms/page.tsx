import type { Metadata } from "next";
import Link from "next/link";

// Third-party imports
import { ArrowRight, Tv } from "lucide-react";

// Local imports
import { PolicyBanner } from "@/components/banners/policy-banner";
import Footer from "@/components/shared/footer";
import { NavbarShell } from "@/components/shared/navbar-shell";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { LEGAL_ROUTES } from "@/lib/legal-routes";

export const metadata: Metadata = {
  title: "Tipmanna Service Terms and Conditions",
  description:
    "The terms and conditions that apply when you use Tipmanna, including the website, creator and host tools, events, payments and the Tipmanna TV app for Android TV.",
};

const linkClass = "text-primary underline underline-offset-2";

export default function ServiceTerms() {
  return (
    <>
      <NavbarShell />

      <PolicyBanner title="Tipmanna Service Terms and Conditions" />

      <section className="section mini-wrapper">
        <div className="space-y-2">
          <Paragraph size="sm">
            <strong>Last updated: 21 November 2026</strong>
          </Paragraph>
          <Paragraph size="sm">
            These Service Terms and Conditions (the &quot;Terms&quot;) set out
            the rules that apply when you visit or use Tipmanna, including our
            website, creator and host tools, videos, events, livestreams,
            communities, TV experiences, payment features, apps and other
            services (together, the &quot;Services&quot;).
          </Paragraph>
          <Paragraph size="sm">
            By creating an account, ticking the box to agree to these Terms, or
            otherwise using the Services, you agree to be bound by these Terms.
            If you do not agree, you must not use the Services.
          </Paragraph>
          <Paragraph size="sm">
            These Terms should be read together with the{" "}
            <Link
              href={LEGAL_ROUTES.privacyPolicy}
              className={linkClass}
            >
              Tipmanna Privacy Policy
            </Link>{" "}
            and the{" "}
            <Link
              href={LEGAL_ROUTES.cookiePolicy}
              className={linkClass}
            >
              Tipmanna Cookie Policy
            </Link>
            .
          </Paragraph>
        </div>

        <aside
          id="product-terms"
          aria-label="Product-specific terms"
          className="border-primary/30 bg-primary/5 my-8 space-y-4 rounded-lg border p-4 sm:p-6"
        >
          <Title
            as="h2"
            size="sm"
          >
            Product-specific terms
          </Title>
          <Paragraph size="sm">
            Some Tipmanna products have additional terms. Where they apply,
            those terms form part of these Terms.
          </Paragraph>
          <Link
            href={LEGAL_ROUTES.androidTvServiceTerms}
            className="bg-card flex flex-col gap-3 rounded-md border p-4 transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-start gap-3">
              <Tv
                aria-hidden
                className="text-primary mt-1 size-6 shrink-0"
              />
              <span className="space-y-1">
                <span className="open_sans block text-base font-semibold sm:text-lg">
                  Tipmanna TV app for Android TV — Service Terms
                </span>
                <span className="open_sans text-muted-foreground block text-sm sm:text-base">
                  Additional terms for watching Tipmanna on Android TV and
                  Google TV devices, signing in, tipping from the TV and
                  reporting content.
                </span>
              </span>
            </span>
            <span className="text-primary open_sans inline-flex shrink-0 items-center gap-2 text-sm font-semibold">
              Read the Android TV terms
              <ArrowRight
                aria-hidden
                className="size-4"
              />
            </span>
          </Link>
        </aside>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            1. WHO WE ARE
          </Title>
          <Paragraph size="sm">Tipmanna is operated by:</Paragraph>
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
            In these Terms, references to{" "}
            <strong>
              &quot;Tipmanna&quot;, &quot;we&quot;, &quot;us&quot; or
              &quot;our&quot;
            </strong>{" "}
            mean Tipmanna Limited. References to &quot;you&quot; mean the person
            using the Services.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            2. ELIGIBILITY
          </Title>
          <Paragraph size="sm">To use the Services you must:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>
              Be at least 18 years old, or the age of majority where you live if
              higher, to create an account, send tips, make payments or receive
              earnings;
            </li>
            <li>Be able to enter into a binding contract with us; and</li>
            <li>
              Not be prevented from using the Services under applicable law.
            </li>
          </ul>
          <Paragraph size="sm">
            If you use the Services on behalf of a business, community or other
            organisation, you confirm that you are authorised to accept these
            Terms on its behalf.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            3. YOUR ACCOUNT
          </Title>
          <Paragraph size="sm">You are responsible for:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Providing accurate and up-to-date account information;</li>
            <li>
              Keeping your sign-in details, one-time codes and devices secure;
            </li>
            <li>All activity that takes place under your account; and</li>
            <li>
              Telling us promptly at{" "}
              <a href="mailto:hello@tipmanna.tv">hello@tipmanna.tv</a> if you
              believe your account has been compromised.
            </li>
          </ul>
          <Paragraph size="sm">
            You may close your account at any time using the available account
            controls. How we handle your information when you close your account
            is explained in the{" "}
            <Link
              href={LEGAL_ROUTES.privacyPolicy}
              className={linkClass}
            >
              Privacy Policy
            </Link>
            .
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            4. CREATORS, HOSTS AND COMMUNITIES
          </Title>
          <Paragraph size="sm">
            If you create a creator, host, channel, community or event on
            Tipmanna, you are responsible for:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>The content you publish or stream;</li>
            <li>
              The accuracy of the information you give viewers, attendees and
              tippers;
            </li>
            <li>
              Obtaining any permissions, licences or consents needed for your
              content, including from people who appear in it; and
            </li>
            <li>
              Complying with laws that apply to you, including tax obligations
              on any earnings.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            5. YOUR CONTENT
          </Title>
          <Paragraph size="sm">
            You keep ownership of the content you upload, stream or post on
            Tipmanna.
          </Paragraph>
          <Paragraph size="sm">
            You grant Tipmanna a worldwide, non-exclusive, royalty-free licence
            to host, store, reproduce, adapt for technical purposes, display,
            distribute and stream your content for the purpose of operating,
            promoting and improving the Services, including on Tipmanna TV,
            Community TV and the Tipmanna TV app for Android TV. This licence
            ends when your content is deleted from the Services, except where it
            has been shared by others or we must retain it for legal reasons.
          </Paragraph>
          <Paragraph size="sm">
            You confirm that you have all rights needed to grant this licence
            and that your content does not infringe anyone else&apos;s rights.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            6. ACCEPTABLE USE
          </Title>
          <Paragraph size="sm">You must not use the Services to:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Break the law or encourage others to do so;</li>
            <li>
              Post or stream content that is sexually exploitative of children,
              terrorist, hateful, harassing, threatening or otherwise harmful;
            </li>
            <li>
              Infringe intellectual property, privacy or other rights of any
              person;
            </li>
            <li>Impersonate any person or misrepresent your identity;</li>
            <li>
              Commit fraud, launder money or misuse payment features, including
              tips;
            </li>
            <li>
              Interfere with, scrape, reverse engineer or attempt to gain
              unauthorised access to the Services; or
            </li>
            <li>Send spam or unsolicited promotions.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            7. REPORTING AND MODERATION
          </Title>
          <Paragraph size="sm">
            You can report content or users that you believe break these Terms
            using the reporting tools in the Services or by emailing{" "}
            <a href="mailto:hello@tipmanna.tv">hello@tipmanna.tv</a>.
          </Paragraph>
          <Paragraph size="sm">
            We may review, restrict, remove or decline to show content, and
            limit, suspend or close accounts, where we reasonably believe this
            is necessary to comply with the law, protect users or enforce these
            Terms. Where appropriate we will tell you about the action we take
            and how you can ask us to review it.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            8. TIPS, PAYMENTS AND EARNINGS
          </Title>
          <Paragraph size="sm">
            Payments on Tipmanna, including tips, subscriptions and other paid
            engagements, are processed by our payment providers, including
            Stripe. Their terms may also apply to you.
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>
              Tips are voluntary payments to support a creator, host or
              community and do not buy any goods, rights or ownership;
            </li>
            <li>
              Prices, fees and the amount a recipient receives are shown before
              you confirm a payment;
            </li>
            <li>
              Tips are generally non-refundable except where required by law,
              where a payment was unauthorised, or where we decide otherwise in
              our discretion; and
            </li>
            <li>
              Payouts to creators and hosts are subject to identity checks,
              payment provider requirements and any applicable fees.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            9. TIPMANNA INTELLECTUAL PROPERTY
          </Title>
          <Paragraph size="sm">
            The Services, including the Tipmanna name, logos, software and
            design, are owned by Tipmanna Limited or its licensors. We give you
            a personal, non-exclusive, non-transferable and revocable licence to
            use the Services in line with these Terms. No other rights are
            granted.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            10. THIRD-PARTY SERVICES
          </Title>
          <Paragraph size="sm">
            The Services may link to or include services provided by others,
            such as payment providers, video platforms and app stores. We are
            not responsible for third-party services, and your use of them may
            be governed by their own terms and policies.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            11. AVAILABILITY AND CHANGES TO THE SERVICES
          </Title>
          <Paragraph size="sm">
            We work to keep the Services available and secure, but we do not
            guarantee that they will always be available, uninterrupted or free
            from errors. We may change, suspend or withdraw features, including
            on particular devices or apps, where reasonably necessary.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            12. SUSPENSION AND TERMINATION
          </Title>
          <Paragraph size="sm">
            We may suspend or close your account if you seriously or repeatedly
            break these Terms, if we are required to by law, or if your use of
            the Services creates risk or legal exposure for Tipmanna or others.
            You may stop using the Services at any time.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            13. OUR LIABILITY
          </Title>
          <Paragraph size="sm">
            Nothing in these Terms excludes or limits our liability for death or
            personal injury caused by our negligence, for fraud or fraudulent
            misrepresentation, or for any other liability that cannot be
            excluded or limited under applicable law. Nothing in these Terms
            affects your statutory rights as a consumer.
          </Paragraph>
          <Paragraph size="sm">
            Subject to that, we are not responsible for losses that were not
            reasonably foreseeable, for content posted or streamed by other
            users, or for business losses where you use the Services for
            business purposes.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            14. CHANGES TO THESE TERMS
          </Title>
          <Paragraph size="sm">
            We may update these Terms as Tipmanna develops or where the law
            requires. Where changes are significant, we will give you reasonable
            notice. The latest revision date appears at the top of these Terms.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            15. GOVERNING LAW
          </Title>
          <Paragraph size="sm">
            These Terms are governed by the law of England and Wales. If you
            live elsewhere in the United Kingdom or in another country, you may
            also benefit from mandatory protections and be able to bring
            proceedings in the courts where you live.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            16. CONTACT US
          </Title>
          <Paragraph size="sm">
            Questions about these Terms can be sent to:
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
