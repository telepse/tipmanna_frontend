import { LIVE_ACTIVITY_FEATURES } from "@/constants";
import { Paragraph } from "../shared/paragraph";
import { Title } from "../shared/title";

export const SupportHappensInTheMoment = () => {
  return (
    <section className="bg-secondary/10 flex flex-col items-center py-6 lg:py-12">
      <div className="wrapper section w-full">
        <div className="border-primary space-y-2 rounded-2xl border-2 bg-white p-4 text-center sm:rounded-3xl sm:p-6 lg:rounded-full lg:p-8 lg:text-left">
          <Title
            size="lg"
            className="text-3xl sm:text-4xl lg:text-6xl"
          >
            Support happens in the{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              moment
            </span>
          </Title>
          <Paragraph
            weight="bold"
            color="muted"
          >
            Not before. Not after. During.
          </Paragraph>
        </div>

        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-12 lg:gap-8">
          <div className="bg-secondary/30 h-[220px] rounded-2xl p-4 sm:h-[280px] lg:col-span-8 lg:h-[350px]">
            <div className="l h-[190px] rounded-2xl bg-white p-4 sm:h-[250px] lg:h-[320px]">
              <video
                src="https://res.cloudinary.com/tipmanna/video/upload/v1785337897/coverr-a-road-through-the-hills-6377-1080p_xyhmmr.mp4"
                autoPlay
                muted
                loop
                className="h-full w-full rounded-2xl object-cover"
              />
            </div>
          </div>

          <div className="space-y-2 lg:col-span-4">
            <Paragraph size="sm">
              <span className="font-semibold uppercase">Live activity</span>{" "}
              &middot; what happens in real time
            </Paragraph>

            <div className="space-y-2">
              {LIVE_ACTIVITY_FEATURES.map(feature => (
                <div
                  key={feature.label}
                  className="bg-secondary/30 flex items-center gap-2 rounded-2xl p-3 sm:p-2"
                >
                  <feature.icon
                    className={`size-5 shrink-0 ${feature.className} ${feature.fill ? "fill-current" : ""}`}
                  />
                  <Paragraph size="xs">{feature.label}</Paragraph>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
