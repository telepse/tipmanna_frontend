import {
  Calendar,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Home", href: "/", id: "home" },
  { label: "Create", href: "", id: "create-event" },
  { label: "FAQs", href: "#faq", id: "faqs" },
];

export const HERO_IMAGES = [
  "/heros/image_1.webp",
  "/heros/image_2.webp",
  "/heros/image_3.webp",
  "/heros/image_4.webp",
];

export const FEATURES = [
  {
    icon: "/icons/charity.png",
    title: "Create Content.",
    content: `Upload videos, stream live, and grow your audience through channels, Explore, and Tipmanna TV. Every piece of content becomes an opportunity to be discovered, shared, and experienced by new supporters.`,
  },
  {
    icon: "/icons/performance.png",
    title: "Turn Viewers Into Participants.",
    content:
      "Most platforms stop at views. Tipmanna helps audiences engage in realtime through comments, reactions, supporter participation, livestream experiences, and shared community moments.",
  },
  {
    icon: "/icons/calendar.png",
    title: "Build More Than An Audience.",
    content:
      "Turn attention into community, and community into recurring engagement. Tipmanna combines content, TV, memberships, livestreams, and supporter participation into one connected ecosystem.",
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
    desc: "Perfect for getting started.",
    btnText: "Create free",
    tier: "free",
    features: [
      "Upload videos",
      "Create channels",
      "Join communties",
      "Appear in discovery",
      "Receive supporter participation",
      "Monthly payouts",
    ],
  },
  {
    name: "Premium",
    price: "£19.99",
    desc: "For serious creators and organisers.",
    discountPrice: "£49.99",
    btnText: "Upgrade to Premium",
    tier: "premium",
    features: [
      "Everything in Free",
      "Advanced analytics",
      "Custom engagement experiences",
      "Membership features",
      "Enhanced discovery",
      "Creator tools",
      "Program promotion requests",
      "Co-owner management",
    ],
  },
  {
    name: "Community",
    price: "£99.99",
    desc: "Operate your own media network.",
    discountPrice: "",
    btnText: "Launch Community TV",
    tier: "community",
    features: [
      "Everything in Premium",
      "Community TV",
      "Membership subscriptions",
      "Private community ecosystem",
      "Program scheduling",
      "Community branding",
      "Community analytics",
      "Broadcast tools",
      "Instant payouts",
    ],
  },
];

export const TRUST_BADGES = [
  {
    icon: "/logos/fr.png",
    label: "Fundraiser",
  },
  {
    icon: "/logos/gdpr.png",
    label: "Data Privacy",
  },
];

export const NEW_TRUST_BADGES = [
  "Creators",
  "Charities",
  "Communities",
  "Faith Organisations",
  "Universities",
  "Sports Clubs",
  "Event Organisers",
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
