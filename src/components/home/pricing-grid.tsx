"use client";

import { PRICING, type PricingTier } from "@/constants";
import { Badge } from "../shared/badge";
import { Paragraph } from "../shared/paragraph";
import { Title } from "../shared/title";
import { PricingCard } from "./pricing-card";
import { CreateDialog } from "./create-dialog";
import SignInDialog from "@/components/auth/sign-in-dialog";

// Import Swiper React components
import { SwiperSlide } from "swiper/react";
import { Pagination, Autoplay, A11y } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/a11y";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import { isHostRole } from "@/lib/is-host-role";
import { toast } from "react-toastify";

const Swiper = dynamic(() => import("swiper/react").then(m => m.Swiper), {
  ssr: false,
});

function hostDashboardSlug(user: RootState["auth"]["user"]): string | null {
  if (!user || !isHostRole(user.role)) return null;
  if ("eventSlug" in user && user.eventSlug) return user.eventSlug;
  return user.username ?? null;
}

export default function PricingGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const pathname = usePathname();
  const pricingReturnPath = `${pathname ?? "/"}#pricing`;
  const { push } = useAppRouter();
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const isSignedInHost = isAuthenticated && !!user && isHostRole(user.role);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handlePlanClick = useCallback(
    (tier: PricingTier) => {
      if (!isSignedInHost) {
        setSignInOpen(true);
        return;
      }

      const slug = hostDashboardSlug(user);
      if (!slug) {
        toast.error("Unable to open host dashboard. Please sign in again.");
        setSignInOpen(true);
        return;
      }

      switch (tier) {
        case "free":
          setCreateOpen(true);
          break;
        case "premium":
          push(`/host/${slug}/host-premium`);
          break;
        case "community":
          push(`/host/${slug}/host-community`);
          break;
      }
    },
    [isSignedInHost, push, user]
  );

  const renderCard = (item: (typeof PRICING)[number], key: number) => (
    <PricingCard
      key={key}
      name={item.name}
      desc={item.desc}
      price={item.price}
      discountPrice={item.discountPrice}
      features={item.features}
      btnText={item.btnText}
      onButtonClick={() => handlePlanClick(item.tier)}
    />
  );

  return (
    <section
      id="pricing"
      className="wrapper section scroll-mt-24 items-center"
    >
      <Badge title="Pricing" />

      <h2
        id="features-heading"
        className="w-full"
      >
        <Title
          align="center"
          size="lg"
        >
          Free to start, premium features later with{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            scalable pricing
          </span>{" "}
        </Title>
      </h2>
      <Paragraph
        align="center"
        color="muted"
        className="-mt-2"
      >
        Start for free, build your audience, and unlock more powerful tools as
        your community grows.
      </Paragraph>

      <div
        className="mt-6 min-h-[200px] w-full lg:hidden"
        ref={ref}
      >
        {visible ? (
          <Swiper
            slidesPerView={3}
            spaceBetween={30}
            loop
            centeredSlides
            autoplay={{ delay: 5000 }}
            pagination={{ clickable: true }}
            modules={[Pagination, Autoplay, A11y]}
            a11y={{
              prevSlideMessage: "Previous feature",
              nextSlideMessage: "Next feature",
              firstSlideMessage: "This is the first feature",
              lastSlideMessage: "This is the last feature",
              paginationBulletMessage: "Go to feature {{index}}",
            }}
            breakpoints={{
              0: { slidesPerView: 1 },
              768: { slidesPerView: 1, spaceBetween: 20 },
              1024: { slidesPerView: 3, spaceBetween: 30 },
            }}
            className="lg:hidden"
          >
            {PRICING.map((item, index) => (
              <SwiperSlide key={index}>{renderCard(item, index)}</SwiperSlide>
            ))}
          </Swiper>
        ) : null}
      </div>

      <div className="mt-6 hidden grid-cols-3 items-start gap-6 lg:grid">
        {PRICING.map((item, index) => renderCard(item, index))}
      </div>

      <CreateDialog
        openPopup={createOpen}
        setOpenPopup={setCreateOpen}
      />

      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        title="Sign in as host to continue"
        returnTo={pricingReturnPath}
        defaultUserType="host"
      />
    </section>
  );
}
