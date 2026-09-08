import { PolicyBanner } from "@/components/banners/policy-banner";
import Footer from "@/components/shared/footer";
import { NavbarShell } from "@/components/shared/navbar-shell";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";

export default function CookiePolicy() {
  return (
    <>
      <NavbarShell />

      <PolicyBanner title="Tipmanna Cookie Policy" />

      <section className="section mini-wrapper">
        <Paragraph size="sm">
          <strong>Last updated: 7 September 2026</strong>
        </Paragraph>
        <Paragraph size="sm">
          This Cookie Policy explains how Tipmanna Limited uses cookies and
          similar technologies when you visit or use Tipmanna.
        </Paragraph>
        <Paragraph size="sm">
          It should be read together with the{" "}
          <strong>Tipmanna Privacy Policy</strong>.
        </Paragraph>

        <div className="space-y-2">
          <Title size="md">1. WHO WE ARE</Title>
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
        </div>

        <div className="space-y-2">
          <Title size="md">2. WHAT ARE COOKIES?</Title>
          <Paragraph size="sm">
            Cookies are small pieces of information placed or stored on your
            browser or device when you visit a website or use an online service.
          </Paragraph>

          <Paragraph size="sm">
            Tipmanna may also use similar technologies, including:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Local storage;</li>
            <li>Session storage;</li>
            <li>Pixels;</li>
            <li>Tags;</li>
            <li>Scripts;</li>
            <li>Device identifiers; and</li>
            <li>Other storage or access technologies.</li>
          </ul>

          <Paragraph size="sm">
            For simplicity, this policy sometimes refers to these technologies
            collectively as "cookies".
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">3. WHY TIPMANNA USES COOKIES</Title>
          <Paragraph size="sm">We may use cookies to:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Keep users signed in;</li>
            <li>Maintain user sessions;</li>
            <li>Protect accounts;</li>
            <li>Detect fraud;</li>
            <li>Provide payment functionality;</li>
            <li>Remember preferences;</li>
            <li>Maintain security;</li>
            <li>Understand platform performance;</li>
            <li>Understand how Tipmanna is used;</li>
            <li>Improve features;</li>
            <li>Provide personalised functionality; and</li>
            <li>Support other services requested by users.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title size="md">4. TYPES OF COOKIES WE MAY USE</Title>

          <h4 className="text-2xl font-bold">4.1 Strictly necessary cookies</h4>
          <Paragraph size="sm">
            These cookies are required for Tipmanna or a requested feature to
            operate properly.
          </Paragraph>
          <Paragraph size="sm">They may support:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Authentication;</li>
            <li>Account login;</li>
            <li>Session management;</li>
            <li>Security;</li>
            <li>Fraud prevention;</li>
            <li>Load balancing;</li>
            <li>Payment processing;</li>
            <li>Cookie preference storage; and</li>
            <li>Other core platform functionality.</li>
          </ul>

          <Paragraph size="sm">
            Some strictly necessary cookies do not require consent under
            applicable UK electronic communications rules.
          </Paragraph>

          <Paragraph size="sm">
            Blocking them may prevent parts of Tipmanna from working.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            4.2 Functionality and preference cookies
          </h4>
          <Paragraph size="sm">
            These technologies may remember choices such as:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Display preferences;</li>
            <li>Language;</li>
            <li>Interface settings;</li>
            <li>User-selected functionality; and</li>
            <li>Other preferences.</li>
          </ul>

          <Paragraph size="sm">
            Certain functionality or appearance technologies may qualify for an
            exception from consent under applicable law where the legal
            conditions are met.
          </Paragraph>

          <Paragraph size="sm">
            Where an applicable exception requires us to provide a simple means
            of objecting, we will provide one.
          </Paragraph>
          <Paragraph size="sm">
            Where no exception applies, we will obtain consent where required.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            4.3 Statistical and analytics technologies
          </h4>
          <Paragraph size="sm">
            We may use statistical technologies to understand matters such as:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Number of visitors;</li>
            <li>Page usage;</li>
            <li>Feature usage;</li>
            <li>Content performance;</li>
            <li>Platform errors;</li>
            <li>Navigation patterns; and</li>
            <li>Service performance.</li>
          </ul>

          <Paragraph size="sm">
            Some limited statistical technologies may be used without prior
            consent where the applicable statutory exception is satisfied.
          </Paragraph>

          <Paragraph size="sm">
            Where we rely on such an exception, we will ensure that the relevant
            technology is used only in accordance with the conditions of that
            exception, including providing an appropriate means of objecting
            where required.
          </Paragraph>

          <Paragraph size="sm">
            Where the exception does not apply, we will obtain consent before
            using analytics cookies where consent is legally required.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            4.4 Advertising and marketing technologies
          </h4>

          <Paragraph size="sm">
            If Tipmanna introduces technologies used for:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Behavioural advertising;</li>
            <li>Cross-site advertising;</li>
            <li>Advertising profiles;</li>
            <li>Retargeting; or</li>
            <li>Similar marketing tracking,</li>

            <Paragraph size="sm">
              we will not activate them before obtaining consent where consent
              is required.
            </Paragraph>
            <Paragraph size="sm">
              Rejecting advertising cookies will not prevent you from accessing
              ordinary Tipmanna features unless the relevant feature
              legitimately requires them.
            </Paragraph>
          </ul>
        </div>

        <div className="space-y-2">
          <Title size="md">5. STRIPE PAYMENT TECHNOLOGIES</Title>

          <Paragraph size="sm">
            Tipmanna uses <strong>Stripe</strong> to help provide payment
            functionality.
          </Paragraph>
          <Paragraph size="sm">
            Stripe may use cookies and similar technologies when you:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Send a tip;</li>
            <li>Purchase a subscription;</li>
            <li>Make another payment;</li>
            <li>Use Stripe-hosted or embedded payment functionality; or</li>
            <li>Interact with supported Stripe payment features.</li>
          </ul>

          <Paragraph size="sm">
            Stripe uses technologies for purposes including:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Payment processing;</li>
            <li>Fraud detection;</li>
            <li>Loss prevention;</li>
            <li>Security;</li>
            <li>Authentication; and</li>
            <li>Payment-service analytics.</li>
          </ul>

          <Paragraph size="sm">
            Depending on Tipmanna's Stripe configuration, technologies used by
            Stripe may include:
          </Paragraph>

          <h4 className="text-2xl font-bold"> __stripe_mid</h4>

          <Paragraph size="sm">
            <strong>Provider</strong>: Stripe
          </Paragraph>
          <Paragraph size="sm">
            <strong>Purpose</strong>: Fraud prevention and risk assessment
          </Paragraph>
          <Paragraph size="sm">
            <strong>Typical duration</strong>: Up to approximately one year
          </Paragraph>

          <h4 className="text-2xl font-bold">__stripe_sid</h4>

          <Paragraph size="sm">
            <strong>Provider</strong>: Stripe
          </Paragraph>
          <Paragraph size="sm">
            <strong>Purpose</strong>: Fraud prevention and risk assessment
          </Paragraph>
          <Paragraph size="sm">
            <strong>Typical duration</strong>: Approximately 30 minutes
          </Paragraph>

          <h4 className="text-2xl font-bold">m</h4>
          <Paragraph size="sm">
            <strong>Provider</strong>: Stripe
          </Paragraph>
          <Paragraph size="sm">
            <strong>Purpose</strong>: Fraud prevention and risk assessment
          </Paragraph>
          <Paragraph size="sm">
            <strong>Duration</strong>: May depend on Stripe's current
            implementation
          </Paragraph>
          <Paragraph size="sm">
            Additional Stripe technologies may be used where features such as
            Stripe-hosted Checkout, Elements or saved-payment functionality are
            enabled.
          </Paragraph>
          <Paragraph size="sm">
            Stripe controls aspects of these technologies and may update them as
            its services change.
          </Paragraph>
          <Paragraph size="sm">
            Tipmanna periodically reviews the technologies deployed by its
            payment integration and should update this policy where there are
            material changes.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">6. TIPMANNA FIRST-PARTY TECHNOLOGIES</Title>
          <Paragraph size="sm">
            Tipmanna may use its own cookies or browser-storage technologies to
            provide functions such as:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>User authentication;</li>
            <li>Session management;</li>
            <li>Security;</li>
            <li>Saved preferences;</li>
            <li>Cookie choices;</li>
            <li>Platform state; and</li>
            <li>Feature operation.</li>
          </ul>

          <Paragraph size="sm">
            The precise technical names of these technologies may change as
            Tipmanna's platform develops.
          </Paragraph>

          <Paragraph size="sm">
            Current details should be available through Tipmanna's Cookie
            Settings or consent-management interface where applicable.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">7. RESEND AND EMAIL TECHNOLOGIES</Title>

          <Paragraph size="sm">
            Tipmanna uses <strong>Resend</strong> to deliver emails.
          </Paragraph>
          <Paragraph size="sm">
            Resend is primarily used by Tipmanna for email delivery rather than
            ordinary website cookie functionality.
          </Paragraph>
          <Paragraph size="sm">
            Email-related information may include:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Recipient address;</li>
            <li>Delivery information;</li>
            <li>Bounce information;</li>
            <li>Message metadata; and</li>
            <li>Message content.</li>
          </ul>
          <Paragraph size="sm">
            Resend also supports optional email open and link tracking.
          </Paragraph>
          <Paragraph size="sm">
            If Tipmanna enables such functionality, we will assess whether
            consent or another requirement applies before using it and provide
            appropriate privacy information.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">8. WHEN WE NEED CONSENT</Title>

          <Paragraph size="sm">
            UK rules do not require consent for every storage or access
            technology.
          </Paragraph>

          <Paragraph size="sm">
            For example, applicable law contains exceptions relating to certain:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>
              Technologies strictly necessary to provide a service requested by
              the user;
            </li>
            <li>Technologies necessary for electronic communications;</li>
            <li>Limited statistical uses;</li>
            <li>Limited appearance or functionality uses; and</li>
            <li>Other uses specifically permitted by law.</li>
          </ul>

          <Paragraph size="sm">Each exception has conditions.</Paragraph>

          <Paragraph size="sm">
            Where none of the available exceptions applies and consent is
            required, Tipmanna will seek consent before activating the
            technology.
          </Paragraph>
        </div>

        <div>
          <Title size="md">9. COOKIE CONTROLS</Title>

          <Paragraph size="sm">
            Where applicable, Tipmanna's cookie interface should allow users to:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Accept optional cookies;</li>
            <li>Reject optional cookies;</li>
            <li>Manage individual categories;</li>
            <li>Change previous choices; and</li>
            <li>Withdraw consent.</li>
          </ul>

          <Paragraph size="sm">
            It should be as easy to reject non-essential technologies as it is
            to accept them.
          </Paragraph>

          <Paragraph size="sm">
            Technologies that require consent should not be activated before the
            user has made the required choice.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">10. WITHDRAWING CONSENT</Title>

          <Paragraph size="sm">
            Where a technology is based on consent, you may withdraw that
            consent at any time using the available Cookie Settings or privacy
            controls.
          </Paragraph>

          <Paragraph size="sm">
            Withdrawal will not affect the lawfulness of processing that
            occurred before consent was withdrawn.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">
            11. OBJECTING TO EXEMPT STATISTICAL OR FUNCTIONAL TECHNOLOGIES
          </Title>

          <Paragraph size="sm">
            Where Tipmanna relies on a statutory exception that requires a
            simple means for users to object, we will make an appropriate
            objection mechanism available.
          </Paragraph>

          <Paragraph size="sm">
            Once a valid objection applies, we will stop using the relevant
            technology for that user or device where required.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">12. BROWSER CONTROLS</Title>

          <Paragraph size="sm">Most browsers allow you to:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>View cookies;</li>
            <li>Delete cookies;</li>
            <li>Block cookies;</li>
            <li>Limit cookies; and</li>
            <li>Control storage technologies.</li>
          </ul>

          <Paragraph size="sm">
            Blocking all cookies may cause some Tipmanna features to stop
            working correctly, particularly login, security and payment-related
            functionality.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">13. THIRD-PARTY SERVICES</Title>

          <Paragraph size="sm">
            Third-party services may change their technologies independently.
          </Paragraph>

          <Paragraph size="sm">
            Tipmanna therefore periodically reviews relevant third-party
            technology, including payment and email services, and updates its
            cookie disclosures where necessary.
          </Paragraph>

          <Paragraph size="sm">
            Our currently identified service providers relevant to this policy
            include:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>
              <strong>Stripe</strong> – payments, security and fraud prevention;
            </li>
            <li>
              <strong>Resend</strong> – email delivery.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title size="md">14. COOKIE AUDITS</Title>

          <Paragraph size="sm">Tipmanna aims to regularly audit:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Cookies;</li>
            <li>Local storage;</li>
            <li>Session storage;</li>
            <li>Third-party scripts;</li>
            <li>Pixels;</li>
            <li>Payment integrations; and</li>
            <li>Similar technologies.</li>
          </ul>

          <Paragraph size="sm">
            This helps ensure that our public disclosures and user controls
            reflect the technologies actually operating on Tipmanna.
          </Paragraph>
        </div>

        <div>
          <Title size="md">15. CHANGES TO THIS POLICY</Title>

          <Paragraph size="sm">
            We may update this Cookie Policy when:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Tipmanna introduces new features;</li>
            <li>Technologies change;</li>
            <li>Service providers change;</li>
            <li>Our use of cookies changes; or</li>
            <li>Applicable law or regulatory guidance changes.</li>
          </ul>

          <Paragraph size="sm">
            The latest revision date appears at the top of this policy.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">16. CONTACT US</Title>

          <Paragraph size="sm">
            Questions about our use of cookies or similar technologies can be
            sent to:
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
            <strong>Last updated</strong>: 7 September 2026
          </Paragraph>
        </div>
      </section>

      <Footer />
    </>
  );
}
