import { PolicyBanner } from "@/components/banners/policy-banner";
import Footer from "@/components/shared/footer";
import { NavbarShell } from "@/components/shared/navbar-shell";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";

export default function PrivacyPolicy() {
  return (
    <>
      <NavbarShell />

      <PolicyBanner title="Tipmanna Privacy Policy" />

      <section className="section mini-wrapper">
        <div className="space-y-2">
          <Paragraph size="sm">
            <strong>Last updated: 7 September 2026</strong>
          </Paragraph>
          <Paragraph size="sm">
            Tipmanna Limited respects your privacy and is committed to
            protecting your personal information.
          </Paragraph>
          <Paragraph size="sm">
            This Privacy Policy explains how we collect, use, disclose, store
            and protect personal information when you visit or use Tipmanna,
            including our website, creator profiles, videos, events,
            livestreams, communities, TV experiences, payment features and other
            services.
          </Paragraph>
          <Paragraph size="sm">
            Please read this Privacy Policy carefully.
          </Paragraph>
        </div>

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
            20 Coombe Road <br />
            Birmingham <br />
            United Kingdom
          </Paragraph>
          <Paragraph size="sm">
            <strong>Email:</strong>{" "}
            <a href="mailto:hello@tipmanna.tv">hello@tipmanna.tv</a>
          </Paragraph>
          <Paragraph size="sm">
            In this Privacy Policy, references to{" "}
            <strong>"Tipmanna", "we", "us" or "our"</strong> mean Tipmanna
            Limited.
          </Paragraph>
          <Paragraph size="sm">
            For the purposes of applicable UK data protection law, Tipmanna
            Limited is the controller of the personal information described in
            this Privacy Policy unless we state otherwise.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            2. ABOUT TIPMANNA
          </Title>
          <Paragraph size="sm">
            Tipmanna is a participatory online TV and social media platform that
            enables people to discover, publish, watch and interact with content
            and enables creators, hosts, event organisers and communities to
            build audiences and experiences.
          </Paragraph>
          <Paragraph size="sm">
            Depending on the features available to you, Tipmanna may enable you
            to:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Create an account and profile;</li>
            <li>Create a creator or host profile;</li>
            <li>Upload and publish videos and other content;</li>
            <li>Discover content;</li>
            <li>Watch Tipmanna TV or Community TV;</li>
            <li>Create or join communities;</li>
            <li>Create or attend events;</li>
            <li>Participate in livestreams;</li>
            <li>Comment, save, share or otherwise interact with content;</li>
            <li>Send tips or other paid engagements;</li>
            <li>Receive earnings;</li>
            <li>Purchase subscriptions;</li>
            <li>Receive payouts;</li>
            <li>Receive platform notifications and communications; and</li>
            <li>Use other features we introduce from time to time.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            3. WHO THIS POLICY APPLIES TO
          </Title>
          <Paragraph size="sm">
            This Privacy Policy applies to personal information we process about
            people who interact with Tipmanna, including:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Visitors;</li>
            <li>Registered users;</li>
            <li>Viewers;</li>
            <li>Creators;</li>
            <li>Hosts;</li>
            <li>Community members;</li>
            <li>Community owners;</li>
            <li>Event organisers;</li>
            <li>Event attendees;</li>
            <li>Tippers and paying users;</li>
            <li>Subscribers;</li>
            <li>Prospective users; and</li>
            <li>People who contact us.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            4. MINIMUM AGE
          </Title>
          <Paragraph size="sm">
            You must be at least 16 years old to create or use a Tipmanna
            account.
          </Paragraph>
          <Paragraph size="sm">
            Tipmanna is not intended for children under 16.
          </Paragraph>
          <Paragraph size="sm">
            If we reasonably believe that an account belongs to a person under
            16, we may suspend or close the account and take appropriate steps
            to delete personal information associated with it, subject to any
            information that we are legally required or otherwise lawfully
            permitted to retain.
          </Paragraph>
          <Paragraph size="sm">
            Users aged 16 or 17 are still children for certain purposes under UK
            data protection law. Where we know that a user is under 18, we will
            take appropriate steps to apply age-appropriate privacy protections
            required by applicable law.
          </Paragraph>
          <Paragraph size="sm">
            If you believe that a person under 16 is using Tipmanna, please
            contact:
          </Paragraph>
          <Paragraph size="sm">
            <a href="mailto:hello@tipmanna.tv">
              <strong>hello@tipmanna.tv</strong>
            </a>
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            5. PERSONAL INFORMATION WE COLLECT
          </Title>
          <Paragraph size="sm">
            The information we collect depends on how you interact with
            Tipmanna.
          </Paragraph>

          <h4 className="text-2xl font-bold">5.1. Account Information</h4>
          <Paragraph size="sm">When you register, we may collect:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Name;</li>
            <li>Display name;</li>
            <li>Username;</li>
            <li>Email address;</li>
            <li>Password credentials or authentication information;</li>
            <li>Date of birth or age information where required;</li>
            <li>Profile photograph;</li>
            <li>Biography;</li>
            <li>Account preferences;</li>
            <li>Account type; and</li>
            <li>Other information you choose to provide.</li>
          </ul>
          <Paragraph size="sm">
            Passwords should be stored using appropriate cryptographic
            protection rather than in plain text.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            5.2. Creator and host information
          </h4>
          <Paragraph size="sm">
            If you become a creator, host, event organiser or community owner,
            we may additionally process:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Creator or organisation name;</li>
            <li>Profile information;</li>
            <li>Social media links;</li>
            <li>Website links;</li>
            <li>Creator categories;</li>
            <li>Channel information;</li>
            <li>Community information;</li>
            <li>Event information;</li>
            <li>Content and playlists;</li>
            <li>Audience information;</li>
            <li>Engagement information;</li>
            <li>Earnings information;</li>
            <li>Payout status;</li>
            <li>Payment-related identifiers;</li> and
            <li>
              Information required to administer your Tipmanna activities.
            </li>
          </ul>

          <h4 className="text-2xl font-bold">
            5.3 Content and social activity
          </h4>
          <Paragraph size="sm">
            We may process information connected with the content and
            interactions you create on Tipmanna, including:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Videos;</li>
            <li>Images;</li>
            <li>Audio;</li>
            <li>Captions;</li>
            <li>Titles;</li>
            <li>Descriptions;</li>
            <li>Comments;</li>
            <li>Community posts;</li>
            <li>Livestream interactions;</li>
            <li>Event participation;</li>
            <li>Saves;</li>
            <li>Shares;</li>
            <li>Reactions;</li>

            <li>Playlists;</li>
            <li>Public messages;</li>
            <li>Tip messages or shout-outs;</li>
            <li>Community participation; and</li>
            <li>Other user-generated content.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            6. PUBLIC INFORMATION
          </Title>
          <Paragraph size="sm">
            Tipmanna contains public and social features.
          </Paragraph>
          <Paragraph size="sm">
            Information that you intentionally publish publicly may be visible
            to: Other Tipmanna users;
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>People who do not have a Tipmanna account;</li>
            <li>People using shared links;</li>
            <li>Viewers of Tipmanna TV;</li>
            <li>Viewers of Community TV;</li>
            <li>
              People using Tipmanna Explore or other discovery features; and
            </li>
            <li>
              Search engines or other services where technically applicable.
            </li>
          </ul>
          <Paragraph size="sm">Public information may include your:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Display name;</li>
            <li>Username;</li>
            <li>Profile image;</li>
            <li>Biography;</li>
            <li>Creator information;</li>
            <li>Videos;</li>
            <li>Events;</li>
            <li>Public communities;</li>
            <li>Public playlists;</li>
            <li>Public posts;</li>
            <li>Comments;</li>
            <li>Public interactions; and</li>
            <li>Other information you choose to make public.</li>
          </ul>
          <Paragraph size="sm">
            Do not publish information that you do not want others to see.
          </Paragraph>
          <Paragraph size="sm">
            You should also avoid publishing another person's personal
            information unless you have an appropriate legal basis or permission
            to do so.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            7. PAYMENT, TIP, SUBSCRIPTION AND PAYOUT INFORMATION
          </Title>
          <Paragraph size="sm">
            Tipmanna uses Stripe to support payment-related services.
          </Paragraph>
          <Paragraph size="sm">
            If you make a payment, send a tip, purchase a subscription, receive
            revenue or receive a payout, information processed may include:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Your name;</li>
            <li>Email address;</li>
            <li>Transaction amount;</li>
            <li>Currency;</li>
            <li>Date and time;</li>
            <li>Transaction identifier;</li>
            <li>Recipient;</li>
            <li>Payment status;</li>
            <li>Subscription information;</li>
            <li>Refund information;</li>
            <li>Payout information;</li>
            <li>Payment method-related information;</li>
            <li>Billing information;</li>
            <li>Fraud and security signals; and</li>
            <li>
              Other information needed to complete or administer the
              transaction.
            </li>
          </ul>

          <Paragraph size="sm">
            Payment card details may be collected directly by Stripe rather than
            Tipmanna.
          </Paragraph>
          <Paragraph size="sm">
            Tipmanna does not intend to store complete payment-card numbers on
            its own systems where those details are processed directly by
            Stripe.
          </Paragraph>
          <Paragraph size="sm">
            Stripe may process personal information for payment processing,
            fraud prevention, authentication, regulatory compliance, loss
            prevention and related payment services.
          </Paragraph>
          <Paragraph size="sm">
            Stripe may act as a processor, controller or joint controller
            depending on the particular processing activity.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            8. EMAIL AND COMMUNICATION INFORMATION
          </Title>
          <Paragraph size="sm">
            We use <strong>Resend</strong> to help deliver emails.
          </Paragraph>
          <Paragraph size="sm">These may include:</Paragraph>
          <ul className="list list-inside">
            {" "}
            text-sm sm:text-base
            <li>Account verification emails;</li>
            <li>Login or security messages;</li>
            <li>Transactional emails;</li>
            <li>Event notifications;</li>
            <li>Community notifications;</li>
            <li>Creator notifications;</li>
            <li>Tip notifications;</li>
            <li>Product announcements;</li>
            <li>Customer-support communications; and</li>
            <li>Marketing communications where permitted.</li>
          </ul>
          <Paragraph size="sm">
            Information processed through our email provider may include:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Recipient email address;</li>
            <li>Sender information;</li>
            <li>Subject;</li>
            <li>Message content;</li>
            <li>Delivery information;</li>
            <li>Bounce information;</li>
            <li>Email metadata; and</li>
            <li>Other technical information required to deliver the email.</li>
          </ul>
          <Paragraph size="sm">
            Where Tipmanna chooses to use email open or link tracking, we will
            only do so where appropriate and in accordance with applicable
            privacy and electronic communications requirements.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            9. TECHNICAL AND USAGE INFORMATION
          </Title>
          <Paragraph size="sm">
            When you visit or use Tipmanna, we may automatically collect
            technical or usage information such as:
          </Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>IP address;</li>
            <li>Browser type;</li>
            <li>Browser version;</li>
            <li>Device type;</li>
            <li>Operating system;</li>
            <li>Device or session identifiers;</li>
            <li>Approximate location inferred from IP address;</li>
            <li>Language;</li>
            <li>Timezone;</li>
            <li>Referral information;</li>
            <li>Pages visited;</li>
            <li>Content viewed;</li>
            <li>Video interactions;</li>
            <li>Events joined;</li>
            <li>Communities visited;</li>
            <li>Features used;</li>
            <li>Session activity;</li>
            <li>Login information;</li>
            <li>Error information;</li>

            <li>Performance information; and</li>
            <li>Security and fraud-prevention information.</li>
          </ul>

          <Paragraph size="sm">
            This information helps us operate, secure and improve Tipmanna.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            10. INFORMATION FROM OTHER PEOPLE
          </Title>

          <Paragraph size="sm">
            Other Tipmanna users may provide information relating to you.
          </Paragraph>

          <Paragraph size="sm">Examples include:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Mentions;</li>
            <li>Comments;</li>
            <li>Community posts;</li>
            <li>Event information;</li>
            <li>Content featuring you;</li>
            <li>Messages;</li>
            <li>Reports;</li>
            <li>Tips;</li>
            <li>Shares; and</li>
            <li>Other platform interactions.</li>
          </ul>

          <Paragraph size="sm">
            We may also receive information from service providers where
            necessary to provide Tipmanna, protect the platform or administer
            transactions.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            11. SPECIAL CATEGORY INFORMATION
          </Title>
          <Paragraph size="sm">
            Some information receives additional protection under data
            protection law, including information relating to matters such as
            health, racial or ethnic origin, religious beliefs, political
            opinions or sexual orientation.
          </Paragraph>
          <Paragraph size="sm">
            Tipmanna does not require users to provide these types of
            information as a general condition of using the platform.
          </Paragraph>
          <Paragraph size="sm">
            However, because Tipmanna hosts user-generated content, users may
            choose to publish content that reveals such information about
            themselves.
          </Paragraph>
          <Paragraph size="sm">
            Users should carefully consider what information they make public.
          </Paragraph>
          <Paragraph size="sm">
            We will not intentionally use sensitive information revealed in user
            content for unrelated purposes such as targeted advertising unless
            we have a lawful basis and any additional legal condition required
            to do so.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title
            as="h2"
            size="md"
          >
            12. HOW WE USE PERSONAL INFORMATION
          </Title>
          <Paragraph size="sm">We may use personal information to:</Paragraph>
          <h4 className="text-2xl font-bold">Provide Tipmanna</h4>
          <Paragraph size="sm">Including to:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Create and manage accounts;</li>
            <li>Operate profiles;</li>
            <li>Host and display content;</li>
            Operate Tipmanna Explore;
            <li>Operate TV experiences;</li>
            <li>Operate communities;</li>
            <li>Operate events;</li>
            <li>Support livestreaming;</li>
            <li>Enable interactions;</li>
            <li>Process subscriptions;</li>
            <li>Enable tipping and paid engagement;</li>
            <li>Process earnings and payouts; and</li>
            <li>Deliver requested services.</li>
          </ul>

          <h4 className="text-2xl font-bold">
            Personalise and organise the service
          </h4>
          <Paragraph size="sm">Including to:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Present relevant content;</li>
            <li>Organise feeds;</li>
            <li>Recommend content;</li>
            <li>Recommend creators or communities;</li>
            <li>Remember preferences; and</li>
            <li>Improve discovery.</li>
          </ul>

          <h4 className="text-2xl font-bold">Operate payments</h4>
          <Paragraph size="sm">Including to:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Process transactions;</li>
            <li>Allocate tips;</li>
            <li>Manage subscriptions;</li>
            <li>Process payouts;</li>
            <li>Handle refunds;</li>
            <li>Maintain financial records; and</li>
            <li>Prevent payment fraud.</li>
          </ul>

          <h4 className="text-2xl font-bold">Communicate with you</h4>
          <Paragraph size="sm">Including:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Service messages;</li>
            <li>Security notifications;</li>
            <li>Transaction notifications;</li>
            <li>Event reminders;</li>
            <li>Community notifications;</li>
            <li>Creator notifications;</li>
            <li>Support communications; and</li>
            <li>Marketing communications where permitted.</li>
          </ul>

          <h4 className="text-2xl font-bold">Protect Tipmanna</h4>
          <Paragraph size="sm">Including to:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Detect fraud;</li>
            <li>Prevent abuse;</li>
            <li>Protect accounts;</li>
            <li>Investigate suspicious activity;</li>
            <li>Enforce our policies;</li>
            <li>Moderate content;</li>
            <li>Prevent spam;</li>
            <li>Protect our systems; and</li>
            <li>Respond to security incidents.</li>
          </ul>

          <h4 className="text-2xl font-bold">
            Understand and improve Tipmanna
          </h4>
          <Paragraph size="sm">Including to:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Analyse platform usage;</li>
            <li>Measure engagement;</li>
            <li>Understand content performance;</li>
            <li>Identify errors;</li>
            <li>Improve features;</li>
            <li>Develop new features;</li>
            <li>Improve user experience; and</li>
            <li>Conduct statistical analysis.</li>
          </ul>

          <h4 className="text-2xl font-bold">Comply with legal obligations</h4>
          <Paragraph size="sm">Including to:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Maintain accounting and tax records;</li>
            <li>Respond to lawful requests;</li>
            <li>Comply with regulatory requirements;</li>
            <li>Enforce legal rights; and</li>
            <li>Establish, exercise or defend legal claims.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title size="md">13. OUR LAWFUL BASES</Title>

          <Paragraph size="sm">
            UK data protection law requires us to have a lawful basis for
            processing personal information.
          </Paragraph>

          <Paragraph size="sm">
            Depending on the activity, we may rely on:
          </Paragraph>

          <h4 className="text-2xl font-bold">Contractual necessity</h4>
          <Paragraph size="sm">
            Where processing is necessary to provide Tipmanna or take steps you
            request before entering into a contract.
          </Paragraph>
          <Paragraph size="sm">Examples include:</Paragraph>
          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Creating an account;</li>
            <li>Publishing your content;</li>
            <li>Providing creator features;</li>
            <li>Providing community features;</li>
            <li>Processing transactions;</li>
            <li>Providing subscriptions;</li>
            <li>Administering payouts.</li>
          </ul>

          <h4 className="text-2xl font-bold">Legitimate interests</h4>

          <Paragraph size="sm">
            Where processing is necessary for Tipmanna's or another person's
            legitimate interests and those interests are not overridden by your
            rights.
          </Paragraph>

          <Paragraph size="sm">These interests may include:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Operating and improving Tipmanna;</li>

            <li>Preventing fraud;</li>
            <li>Securing our platform;</li>
            <li>Understanding use of our services;</li>
            <li>Providing relevant content;</li>
            <li>Administering our business; and</li>
            <li>Establishing or defending legal rights.</li>
          </ul>

          <Paragraph size="sm">
            Where appropriate, we assess these interests against the potential
            impact on individuals.
          </Paragraph>

          <h4 className="text-2xl font-bold">Legal obligation</h4>

          <Paragraph size="sm">
            Where processing is necessary for us to comply with law.
          </Paragraph>

          <Paragraph size="sm">This may include:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            Tax requirements; Accounting requirements; Regulatory obligations;
            Fraud-prevention obligations; and Responding to legally valid
            requests.
          </ul>

          <h4 className="text-2xl font-bold">Consent</h4>
          <Paragraph size="sm">
            We may rely on consent where required, including for certain:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Marketing activities;</li>
            <li>Cookies or similar technologies;</li>
            <li>Optional tracking; or</li>
            <li>
              Other processing where consent is the appropriate lawful basis.
            </li>
          </ul>

          <Paragraph size="sm">
            Where we rely on consent, you may withdraw it at any time.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">14. MARKETING</Title>

          <Paragraph size="sm">
            We may send you marketing communications about Tipmanna where we are
            legally permitted to do so.
          </Paragraph>

          <Paragraph size="sm">
            Depending on the circumstances, we may rely on consent or another
            basis permitted by applicable law.
          </Paragraph>

          <Paragraph size="sm">
            Marketing messages will provide an appropriate way to unsubscribe.
          </Paragraph>

          <Paragraph size="sm">You may also contact:</Paragraph>

          <Paragraph size="sm">
            <a href="mailto:hello@tipmanna.tv">
              <strong>hello@tipmanna.tv</strong>
            </a>
          </Paragraph>

          <Paragraph size="sm">
            to ask us to stop sending marketing communications.
          </Paragraph>

          <Paragraph size="sm">
            Unsubscribing from marketing will not prevent us from sending
            essential service communications such as:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Security notices;</li>
            <li>Account messages;</li>
            <li>Transaction confirmations;</li>
            <li>Payment information;</li>
            <li>Important platform notices; or</li>
            <li>Other communications necessary to provide your account.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title size="md">15. COOKIES AND SIMILAR TECHNOLOGIES</Title>

          <Paragraph size="sm">
            Tipmanna may use cookies and similar storage or access technologies
            such as:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Browser cookies;</li>
            <li>Local storage;</li>
            <li>Session storage;</li>
            <li>Pixels;</li>
            <li>Tags; and</li>
            <li>Similar device technologies.</li>
          </ul>

          <Paragraph size="sm">They may be used to:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Keep you signed in;</li>
            <li>Protect accounts;</li>
            <li>Remember preferences;</li>
            <li>Provide payment functionality;</li>
            <li>Prevent fraud;</li>
            <li>Understand platform use;</li>
            <li>Improve performance; and</li>
            <li>Support other permitted functionality.</li>
          </ul>

          <Paragraph size="sm">
            Some technologies may operate without consent where an applicable
            legal exception applies.
          </Paragraph>

          <Paragraph size="sm">
            Where consent is legally required, we will seek consent before using
            the relevant technology.
          </Paragraph>

          <Paragraph size="sm">
            For more information, please read the{" "}
            <strong>Tipmanna Cookie Policy</strong> and use our available cookie
            or privacy controls.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">
            16. AUTOMATED SYSTEMS, RECOMMENDATIONS AND PROFILING
          </Title>

          <Paragraph size="sm">
            Tipmanna may use automated systems to assist with:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Content ranking;</li>
            <li>Recommendations;</li>
            <li>Content discovery;</li>
            <li>Fraud detection;</li>
            <li>Spam prevention;</li>
            <li>Security;</li>
            <li>Moderation;</li>
            <li>Analytics;</li> and
            <li>Platform personalisation.</li>
          </ul>

          <Paragraph size="sm">
            Third-party providers such as Stripe may also use automated systems
            for payment security and fraud prevention.
          </Paragraph>

          <Paragraph size="sm">
            Where Tipmanna makes a decision based solely on automated processing
            that produces a legal or similarly significant effect on you, we
            will provide the safeguards required by applicable law.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">17. WHO WE SHARE PERSONAL INFORMATION WITH</Title>

          <Paragraph size="sm">
            We may share personal information where necessary with:
          </Paragraph>

          <h4 className="text-2xl font-bold">Stripe</h4>
          <Paragraph size="sm">For:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Payment processing;</li>
            <li>Tips;</li>
            <li>Subscriptions;</li>
            <li>Payouts;</li>
            <li>Fraud prevention;</li>
            <li>Authentication;</li>
            <li>Payment security; and</li>
            <li>Related financial services.</li>
          </ul>

          <h4 className="text-2xl font-bold">Resend</h4>
          <Paragraph size="sm">For:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Transactional email delivery;</li>
            <li>Account communications;</li>
            <li>Notifications;</li>
            <li>Support-related communications; and</li>
            <li>Marketing email where applicable.</li>
          </ul>

          <h4 className="text-2xl font-bold">
            Infrastructure and technical providers
          </h4>

          <Paragraph size="sm">Where used, providers supporting:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Hosting;</li>
            <li>Databases;</li>
            <li>Storage;</li>
            <li>Video delivery;</li>
            <li>Security;</li>
            <li>Monitoring;</li>
            <li>Authentication; and</li>
            <li>Software infrastructure.</li>
          </ul>

          <Paragraph size="sm">
            We will update our privacy information where additional providers
            materially affect how personal information is processed.
          </Paragraph>

          <h4 className="text-2xl font-bold">Professional advisers</h4>

          <Paragraph size="sm">Such as:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Lawyers;</li>
            <li>Accountants;</li>
            <li>Auditors;</li>
            <li>Insurers; and</li>
            <li>Professional consultants.</li>
          </ul>

          <h4 className="text-2xl font-bold">
            Government, regulatory and law-enforcement bodies
          </h4>

          <Paragraph size="sm">
            Where disclosure is required or permitted by law.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            Business transaction recipients
          </h4>

          <Paragraph size="sm">If Tipmanna undergoes a:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Merger;</li>
            <li>Acquisition;</li>
            <li>Investment;</li>
            <li>Financing;</li>
            <li>Reorganisation;</li>
            <li>Sale of assets; or</li>
            <li>Similar corporate transaction,</li>
          </ul>

          <Paragraph size="sm">
            personal information may be disclosed where reasonably necessary and
            subject to appropriate protections.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">18. WE DO NOT SELL PERSONAL INFORMATION</Title>

          <Paragraph size="sm">
            Tipmanna does not sell your personal information as a product to
            third parties.
          </Paragraph>

          <Paragraph size="sm">
            If our business model or data practices materially change, we will
            update this Privacy Policy and comply with applicable law.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">19. INTERNATIONAL TRANSFERS</Title>

          <Paragraph size="sm">
            Some service providers may process personal information outside the
            United Kingdom.
          </Paragraph>

          <Paragraph size="sm">
            For example, providers such as Stripe and Resend operate
            internationally and may process information in the United States or
            other countries.
          </Paragraph>

          <Paragraph size="sm">
            When an international transfer requires a legal transfer mechanism,
            we take steps designed to ensure that appropriate safeguards are in
            place.
          </Paragraph>

          <Paragraph size="sm">
            Depending on the circumstances, these may include:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>UK adequacy regulations;</li>
            <li>The UK Extension to an approved Data Privacy Framework;</li>
            <li>The UK International Data Transfer Agreement;</li>
            <li>
              The UK Addendum to approved Standard Contractual Clauses; or
            </li>
            <li>Another transfer mechanism permitted under UK law.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title size="md">20. DATA RETENTION</Title>

          <Paragraph size="sm">
            We do not intend to retain personal information for longer than
            reasonably necessary.
          </Paragraph>

          <Paragraph size="sm">
            How long we retain information depends on:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Why we collected it;</li>
            <li>The nature of the information;</li>
            <li>Whether your account remains active;</li>
            <li>Legal obligations;</li>
            <li>Financial and accounting requirements;</li>
            <li>Security requirements;</li>
            <li>Fraud-prevention requirements;</li>
            <li>Dispute resolution;</li> and
            <li>
              Whether information is required to establish or defend legal
              claims.
            </li>
          </ul>

          <Paragraph size="sm">In particular:</Paragraph>

          <h4 className="text-2xl font-bold">
            Account and profile information
          </h4>

          <Paragraph size="sm">
            Generally retained while your account remains active and for the
            period reasonably required to complete account closure, deletion,
            security checks and backup cycles.
          </Paragraph>

          <h4 className="text-2xl font-bold">User content</h4>

          <Paragraph size="sm">
            Generally retained while published or while your account remains
            active, unless you delete the content or it is removed.
          </Paragraph>
          <Paragraph size="sm">
            Some copies may remain temporarily in backups or caches after
            deletion.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            Financial and transaction records
          </h4>

          <Paragraph size="sm">
            Certain records associated with payments, tips, subscriptions,
            earnings and payouts may need to be retained for approximately six
            years or longer where required by tax, accounting or legal
            obligations.
          </Paragraph>

          <h4 className="text-2xl font-bold">Security records</h4>

          <Paragraph size="sm">
            Security and fraud-prevention information is retained for a period
            proportionate to the relevant security risk.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            Privacy requests and complaints
          </h4>

          <Paragraph size="sm">
            We may retain records of requests and complaints for the period
            reasonably necessary to demonstrate compliance and manage legal
            risks.
          </Paragraph>

          <h4 className="text-2xl font-bold">
            Marketing suppression information
          </h4>

          <Paragraph size="sm">
            If you unsubscribe, we may retain limited information necessary to
            ensure that your preference continues to be honoured.
          </Paragraph>

          <Paragraph size="sm">
            When information is no longer required, we aim to delete, anonymise
            or securely dispose of it.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">21. ACCOUNT AND CONTENT DELETION</Title>

          <Paragraph size="sm">
            You may delete content using available Tipmanna controls where the
            feature permits it.
          </Paragraph>

          <Paragraph size="sm">
            You may also request closure or deletion of your Tipmanna account.
          </Paragraph>

          <Paragraph size="sm">
            Following account deletion, we will take reasonable steps to remove
            or anonymise personal information that we no longer need.
          </Paragraph>

          <Paragraph size="sm">
            We may retain information where necessary for:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Legal compliance;</li>
            <li>Tax and accounting;</li>
            <li>Fraud prevention;</li>
            <li>Security;</li>
            <li>Resolving disputes;</li>
            <li>Enforcing agreements;</li>
            <li>Establishing or defending legal claims; or</li>
            <li>Other lawful purposes.</li>
          </ul>

          <Paragraph size="sm">
            Public information that has already been independently copied or
            shared by another person may remain outside Tipmanna's control.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">22. YOUR DATA PROTECTION RIGHTS</Title>

          <Paragraph size="sm">
            Depending on the circumstances, you may have the right to:
          </Paragraph>

          <h4 className="text-2xl font-bold">Access</h4>
          <Paragraph size="sm">
            {" "}
            Ask whether we process your personal information and request a copy.
          </Paragraph>
          <h4 className="text-2xl font-bold">Rectification</h4>
          <Paragraph size="sm">
            Ask us to correct inaccurate or incomplete information.
          </Paragraph>
          <h4 className="text-2xl font-bold">Erasure</h4>
          <Paragraph size="sm">
            Ask us to delete personal information in circumstances where the law
            gives you that right.
          </Paragraph>
          <h4 className="text-2xl font-bold">Restriction</h4>
          <Paragraph size="sm">
            Ask us to restrict certain processing.
          </Paragraph>
          <h4 className="text-2xl font-bold">Data portability</h4>
          <Paragraph size="sm">
            Receive certain information you provided to us in a structured,
            commonly used and machine-readable format where the legal conditions
            apply.
          </Paragraph>
          <h4 className="text-2xl font-bold">Object</h4>
          <Paragraph size="sm">
            Object to certain processing based on legitimate interests.
          </Paragraph>
          <Paragraph size="sm">
            You also have an absolute right to object to personal information
            being used for direct marketing.
          </Paragraph>
          <h4 className="text-2xl font-bold">Withdraw consent</h4>
          <Paragraph size="sm">
            Where processing is based on consent, withdraw that consent at any
            time.
          </Paragraph>
          <h4 className="text-2xl font-bold">
            Automated decision-making rights
          </h4>
          <Paragraph size="sm">
            Exercise applicable rights relating to qualifying solely automated
            decisions.
          </Paragraph>
          <Paragraph size="sm">
            These rights are subject to legal conditions and exemptions.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">23. HOW TO EXERCISE YOUR RIGHTS</Title>
          <Paragraph size="sm">
            You can make a privacy request by contacting:
          </Paragraph>
          <Paragraph size="sm">
            <a href="mailto:hello@tipmanna.tv">
              <strong>hello@tipmanna.tv</strong>
            </a>
          </Paragraph>
          <Paragraph size="sm">
            Please explain what you are requesting.
          </Paragraph>
          <Paragraph size="sm">
            We may ask for reasonable information to verify your identity where
            necessary.
          </Paragraph>
          <Paragraph size="sm">
            We will respond without undue delay and within the period required
            by applicable law.
          </Paragraph>
          <Paragraph size="sm">
            Most qualifying data-protection rights requests must normally be
            dealt with within one month, although the law permits extensions in
            certain circumstances.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">24. DATA PROTECTION COMPLAINTS</Title>

          <Paragraph size="sm">
            If you believe that Tipmanna has not handled your personal
            information appropriately, you can make a data protection complaint
            to:
          </Paragraph>

          <Paragraph size="sm">
            <a href="mailto:hello@tipmanna.tv">
              <strong>hello@tipmanna.tv</strong>
            </a>
          </Paragraph>

          <Paragraph size="sm">
            Please include enough information for us to understand the issue.
          </Paragraph>

          <Paragraph size="sm">We will:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Provide a clear means for you to raise the complaint;</li>
            <li>Acknowledge receipt within 30 days;</li>
            <li>Take appropriate steps to investigate it;</li>
            <li>Communicate the outcome without undue delay.</li>
          </ul>

          <Paragraph size="sm">
            We encourage you to contact us first so that we have an opportunity
            to address your concern.
          </Paragraph>

          <Paragraph size="sm">
            You also have the right to complain to the UK's data protection
            regulator, the{" "}
            <strong>Information Commissioner's Office (ICO)</strong>.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">25. SECURITY</Title>

          <Paragraph size="sm">
            We use appropriate technical and organisational measures designed to
            protect personal information from:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Unauthorised access;</li>
            <li>Loss;</li>
            <li>Destruction;</li>
            <li>Disclosure;</li>
            <li>Alteration; and</li>
            <li>Misuse.</li>
          </ul>

          <Paragraph size="sm">
            Our security approach may include, as appropriate:
          </Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Access controls;</li>
            <li>Authentication;</li>
            <li>Encryption;</li>
            <li>Secure communications;</li>
            <li>Monitoring;</li>
            <li>Logging;</li>
            <li>Secure development practices;</li>
            <li>Staff access restrictions;</li>
            <li>Backups;</li> and
            <li>Incident-response procedures.</li>
          </ul>

          <Paragraph size="sm">
            No online system can provide an absolute guarantee of security.
          </Paragraph>

          <Paragraph size="sm">
            Users are responsible for keeping account credentials confidential
            and should tell us promptly if they believe their Tipmanna account
            has been compromised.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">26. PERSONAL DATA BREACHES</Title>

          <Paragraph size="sm">
            If a personal data breach occurs, we will assess the incident and
            take appropriate action.
          </Paragraph>

          <Paragraph size="sm">We maintain procedures designed to:</Paragraph>

          <ul className="list-inside list-disc text-sm sm:text-base">
            <li>Contain incidents;</li>
            <li>Investigate what happened;</li>
            <li>Assess potential harm;</li>
            <li>Record breaches;</li>
            <li>Notify the ICO where legally required; and</li>
            <li>Notify affected individuals where legally required.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Title size="md">27. LINKS TO OTHER SERVICES</Title>

          <Paragraph size="sm">
            Tipmanna may contain links to third-party websites, creator websites
            or other services.
          </Paragraph>

          <Paragraph size="sm">
            We do not control those third parties and their privacy practices
            may differ from ours.
          </Paragraph>

          <Paragraph size="sm">
            You should review their privacy information before providing
            personal information to them.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">28. CHANGES TO THIS POLICY</Title>

          <Paragraph size="sm">
            We may update this Privacy Policy as Tipmanna develops or where
            legal, regulatory, technical or operational changes require us to do
            so.
          </Paragraph>

          <Paragraph size="sm">
            If a change is material, we may provide additional notice through
            Tipmanna or by another appropriate method.
          </Paragraph>

          <Paragraph size="sm">
            The date at the top of the policy shows when it was most recently
            updated.
          </Paragraph>
        </div>

        <div className="space-y-2">
          <Title size="md">29. CONTACT US</Title>

          <Paragraph size="sm">
            For privacy enquiries, rights requests or complaints, contact:
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
            <strong>Email:</strong>{" "}
            <a href="mailto:hello@tipmanna.tv">hello@tipmanna.tv</a>
          </Paragraph>

          <Paragraph size="sm">
            <strong>Last updated: 7 September 2026</strong>
          </Paragraph>
        </div>
      </section>

      <Footer />
    </>
  );
}
