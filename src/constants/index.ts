import {
  Calendar,
  CloudUpload,
  Earth,
  GraduationCap,
  Headset,
  Heart,
  House,
  MessageSquare,
  Mic,
  MonitorUp,
  Share2,
  Sprout,
  Target,
  TicketPercent,
  TrendingUp,
  Trophy,
  Users,
  UsersRound,
  Volleyball,
  Wallet,
} from "lucide-react";

export const HERO_IMAGES = [
  "/heros/creator_channel_slide.png",
  "/heros/event_room_slide.png",
  "/heros/explore_slide.png",
  "/heros/tipmanna_tv_slide.png",
];

export const CONTINUOUS_ENGAGEMENT_SLIDES = [
  {
    image: "/partner/creator_channel_slide_partner.webp",
    title: "Creator Channel",
    alt: "A home for content, community, and repeat engagement.",
  },
  {
    image: "/partner/event_room_slide_partner.webp",
    title: "Event Room",
    alt: "Live moments with comments, reactions, and supporter activity.",
  },
  {
    image: "/partner/explore_slide_partner.webp",
    title: "TV Explore",
    alt: "Discovery that reaches beyond existing followers.",
  },
  {
    image: "/partner/tipmanna_tv_slide_partner.webp",
    title: "Live TV",
    alt: "24/7 scheduled broadcast of featured contents across the platform",
  },
  {
    image: "/partner/dashboard_slide_partner.webp",
    title: "Dashboard",
    alt: "Broadcast updates, reminders, analytics, and growth tools.",
  },
];

export const PARTNER_FAQS = [
  {
    question: "Do people need an account to support me?",
    answer:
      "No. People can participate and support instantly. Creating an account is optional and can be done later.",
  },
  {
    question: "Can people watch my content for free?",
    answer:
      "Yes. Most content on Tipmanna can be watched freely. Support happens when people choose to participate, engage, or contribute.",
  },
  {
    question: "What is Community TV?",
    answer:
      "Community TV gives organisations, communities, clubs, and groups their own dedicated 24/7 TV channel within Tipmanna. It can be used to showcase content, schedule programs, engage members, and build recurring community experiences.",
  },
  {
    question: "Can I offer memberships?",
    answer:
      "Yes. Community plans allow you to create memberships, offer exclusive experiences, and build recurring supporter relationships.",
  },
  {
    question: "Can I host livestreams and events?",
    answer:
      "Yes. You can host livestreams, virtual events, and community experiences through Event Rooms with realtime participation, comments, reactions, and supporter engagement.",
  },
  {
    question: "How does discovery work?",
    answer:
      "Your content can be discovered through channels, Explore, featured placements, community experiences, and Tipmanna TV, helping you reach audiences beyond your existing followers.",
  },
  {
    question: "Is Tipmanna only for creators?",
    answer:
      "No. Tipmanna is built for creators, charities, event organisers, faith organisations, universities, clubs, sports communities, and anyone looking to bring people together around shared experiences.",
  },
  {
    question: "Is Tipmanna secure?",
    answer:
      "Yes. Security, privacy, and trusted payment processing are core platform priorities. We are committed to providing a safe and reliable experience for creators, communities, and supporters.",
  },
] as const;

export const CONTENT_TO_GROWTH_STEPS = [
  {
    title: "Create",
    content:
      "Your channel is where everything starts. Every piece of content opens your world.",
  },
  {
    title: "Engage",
    content:
      "Viewers don't just watch - they react, comment, and participate in real time.",
  },
  {
    title: "Grow",
    content:
      "Build returning audiences through shared experiences and visible participation.",
  },
];

export const WHAT_YOU_CREATE = [
  {
    icon: Mic,
    label: "Create",
    className: "bg-white text-black",
    iconClassName: "text-primary",
  },
  {
    icon: CloudUpload,
    label: "Upload",
    className: "bg-black text-white",
  },
  {
    icon: Share2,
    label: "Share",
    className: "bg-black text-white",
  },
  {
    icon: UsersRound,
    label: "Discovery",
    className: "bg-black text-white",
  },
  {
    icon: Sprout,
    label: "Grow",
    className: "bg-white text-black",
    iconClassName: "text-primary",
  },
];

export const WHAT_YOU_CREATE_MOBILE = [
  {
    icon: CloudUpload,
    label: "Upload",
    className: "bg-black text-white",
  },
  {
    icon: Share2,
    label: "Share",
    className: "bg-black text-white",
  },
  {
    icon: UsersRound,
    label: "Discovery",
    className: "bg-black text-white",
  },
];

export const DISCOVER_FEATURES = [
  {
    title: "Creator Channel",
    content:
      "Creator channel gives every creator and organisation a place to add videos or live events and grow their audience",
    cardClassName: "bg-gradient-to-r from-[#FFFFFF] to-[#F57D11]",
    titleClassName: "bg-[#F8AC68]",
  },
  {
    title: "TV Explore",
    content:
      "TV Explore helps people explore contents, discover creators, communities, live events, and experiences",
    cardClassName: "bg-gradient-to-r from-[#FFFFFF] to-[#703601]",
    titleClassName: "bg-[#E5DAD0]",
  },
  {
    title: "Tipmanna TV",
    content:
      "Tipmanna TV brings explore to life through 24/7 content broadcast, scheduled programs, and shared experiences",
    cardClassName: "bg-gradient-to-r from-[#FFFFFF] to-[#F57D11]",
    titleClassName: "bg-[#FDE8D5]",
  },
];

export const LIVE_ACTIVITY_FEATURES = [
  {
    icon: Heart,
    label: "Live reactions",
    className: "text-destructive",
    fill: true,
  },
  {
    icon: MessageSquare,
    label: "Comments & conversation",
    className: "text-primary",
  },
  {
    icon: Headset,
    label: "Supporter activity",
    className: "text-violet-700",
  },
  {
    icon: MonitorUp,
    label: "Shared viewing experiences",
    className: "text-cyan-700",
  },
  {
    icon: UsersRound,
    label: "Event participation moments",
    className: "text-primary",
  },
];

export const ALREADY_WATCHING_FEATURES = [
  {
    title: "Viewers",
    content: "become participants",
    className: "border-white bg-primary",
    textClassName: "text-black",
  },
  {
    title: "Participation",
    content: "builds connection",
    className: "border-primary bg-primary/50",
    textClassName: "text-white",
  },
  {
    title: "Connection",
    content: "becomes lasting",
    className: "border-white bg-primary",
    textClassName: "text-black",
  },
] as const;

export const FEATURES = [
  {
    icon: Mic,
    title: "Creators",
    content: `Build an audience that watches, participates, and supports.`,
  },
  {
    icon: Earth,
    title: "Charities",
    content: "Turn supporters into an active community around your mission.",
  },
  {
    icon: TicketPercent,
    title: "Events Orgs",
    content: "Keep engagement alive before, during, and after every event.",
  },
  {
    icon: House,
    title: "Communities",
    content:
      "Create a home for your members with content, conversations, and shared experiences..",
  },
  {
    icon: GraduationCap,
    title: "Schools & Universities",
    content:
      "Bring students together around events, programs, and campus life.",
  },
  {
    icon: Volleyball,
    title: "Sports & Faith Groups",
    content:
      "Keep your supporters connected beyond match day or gathering day.",
  },
];

export type PricingTier = "free" | "premium" | "community";

export const PRICING: {
  name: string;
  price: string;
  desc: string;
  btnText: string;
  tier: PricingTier;
  discountPrice?: string;
  features: string[];
}[] = [
  {
    name: "Free",
    price: "£0",
    desc: "Start creating and building your audience.",
    btnText: "Start free",
    tier: "free",
    features: [
      "Create your channel",
      "Upload videos and livestreams",
      "Share events",
      "Appear in explore and discovery",
      "Receive tips and supporter participation",
      "Join communities",
      "Monthly payouts",
    ],
  },
  {
    name: "Growth",
    price: "£9.99",
    desc: "Grow engagement and build recurring relationships.",
    discountPrice: "£29.99",
    btnText: "Upgrade to Growth",
    tier: "premium",
    features: [
      "Everything in Free",
      "Advanced analytics",
      "Enhanced discovery opportunities",
      "Program promotion requests",
      "Custom engagement experiences",
      "Co-owner management",
      "Creator growth tools",
      "Priority feature access",
    ],
  },
  {
    name: "Community",
    price: "£49.99",
    desc: "Run your own community media network.",
    discountPrice: "£99.99",
    btnText: "Launch Community TV",
    tier: "community",
    features: [
      "Everything in Premium",
      "Community TV Channel",
      "Community memberships",
      "Whitelabel community mode",
      "Program scheduling",
      "Community branding",
      "Broadcast messaging",
      "Community analytics",
      "Co-creator management",
    ],
  },
];

export const TRUST_BADGES = [
  "Creators",
  "Charities",
  "Communities",
  "Faith Orgs",
  "Universities",
  "Sports Clubs",
  "Event Orgs",
];

export const PROFILE_CHARACTERS = [
  {
    name: "Comedy Mask",
    icon: "/icons/mask.png",
    time: "14:30",
    price: "15",
  },
  {
    name: "Clown Face",
    icon: "/icons/clown.png",
    time: "15:45",
    price: "20",
  },
  {
    name: "Comment",
    icon: "/icons/comment.png",
    time: "16:20",
    price: "50",
  },
];

export const PROFILE_EVENTS = [
  {
    name: "MC Cooper Comedy",
    date: "2025-08-10",
    rating: 4,
    price: 85,
  },
  {
    name: "Jazz Night at Blue Moon",
    date: "2025-08-10",
    rating: 4,
    price: 100,
  },
  {
    name: "Jazz Night at Blue Moon",
    date: "2025-08-10",
    rating: 4,
    price: 100,
  },
];

export const PROFILE_MILESTONES = [
  {
    title: "Tipper",
    description: "Made your first tip to unlock the tipper milestone",
    progress: 100,
    status: "unlocked",
  },
  {
    title: "Terrific",
    description:
      "Tipped over £100 total in a single event to show your support",
    progress: 85,
    status: "unlocked",
  },
  {
    title: "Tremendous",
    description: "Tipped over £5000 across all events to become legendary",
    progress: 0,
    status: "locked",
  },
];

export const PROFILE_AWARDS = [
  {
    id: "local",
    label: "Local",
    desc: "< 10 events",
  },
  {
    id: "county",
    label: "County",
    desc: "10-20 events",
  },
  {
    id: "national",
    label: "National",
    desc: "20 - 50 events",
  },
  {
    id: "global",
    label: "Global",
    desc: "50 + events",
  },
];

export const EVENT_STATS = [
  {
    title: "Active Events",
    value: 3,
    icon: Calendar,
    subtitle: "Currently ongoing",
  },
  {
    title: "Total Tips Received",
    value: 5000,
    icon: Wallet,
    subtitle: "Cummulative across all events",
    isMoney: true,
  },
  {
    title: "Completed Events",
    value: 47,
    icon: TrendingUp,
    subtitle: "Successfully finished",
  },
  {
    title: "Avg Tipper Engagement",
    value: 4.6,
    icon: Users,
    subtitle: "Average rating",
    isRating: true,
  },
];

export const EVENT_PROFILE_STATS = [
  {
    title: "Total Channels Created",
    value: 12,
    icon: Calendar,
  },
  {
    title: "Total Attendees Reached",
    value: 5400,
    icon: Users,
    isMoney: true,
  },
  {
    title: "Total Tips Earned",
    value: 15200,
    icon: Wallet,
  },
  {
    title: "Average Tip Per Event",
    value: 1267,
    icon: TrendingUp,
    isRating: true,
  },
];

export const RECENT_EVENTS = [
  {
    eventName: "Comedy Night Special",
    eventDate: "15 Jan 2025",
    numOfTippers: 245,
    amountTipped: 1850,
  },
  {
    eventName: "Comedy Night Special",
    eventDate: "15 Jan 2025",
    numOfTippers: 245,
    amountTipped: 1850,
  },
  {
    eventName: "Comedy Night Special",
    eventDate: "15 Jan 2025",
    numOfTippers: 245,
    amountTipped: 1850,
  },
  {
    eventName: "Comedy Night Special",
    eventDate: "15 Jan 2025",
    numOfTippers: 245,
    amountTipped: 1850,
  },
];

export const ACHIEVEMENTS = [
  {
    icon: Trophy,
    title: "First Channel",
    subtitle: "Hosted your first channel",
    iconColor: "#f57d11",
  },
  {
    icon: Users,
    title: "1000+ Attendees",
    subtitle: "Reached over 1000 total attendees",
    iconColor: "#04802E",
  },
  {
    icon: Target,
    title: "Event Master",
    subtitle: "Hosted 25+ successful events",
    iconColor: "#7AADCC",
  },
];

export const PAYOUT_SUMMARY = [
  {
    label: "Pending Payouts",
    value: 0,
    bgColor: "#FFF3E7",
    txtColor: "#CB6305",
  },
  {
    label: "Total Received",
    value: 0,
    bgColor: "#E5FFE3",
    txtColor: "#04802E",
  },
];
