import HeroClient from "./hero-client";

export const HeroServer = () => {
  // Server renders above fold static, client handles interactivity
  return <HeroClient />;
};
