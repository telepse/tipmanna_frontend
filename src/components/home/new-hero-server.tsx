import NewHeroClient from "./new-hero-client";

export const NewHeroServer = () => {
  // Server renders above fold static, client handles interactivity
  return <NewHeroClient />;
};
