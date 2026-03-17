/* eslint-disable @typescript-eslint/no-explicit-any */
import Footer from "@/components/shared/footer";
import { TipperBanner } from "./tipper-banner";
import { ProfileTabs } from "./profile-tabs";

type Cause = {
  id: string;
  logoUrl: string;
  name: string;
};

interface Props {
  events: any[];
  iTipped: number;
  causes: Cause[];
}

export const TipperProfileClient = ({ events, iTipped, causes }: Props) => {
  return (
    <>
      {/* <NavbarShell /> */}
      <TipperBanner iTipped={iTipped} />

      <section
        className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(/vectors/tipping_pattern_new.webp)` }}
      >
        <ProfileTabs
          events={events}
          causes={causes}
        />
      </section>
      <Footer />
    </>
  );
};
