import { DISCOVER_FEATURES } from "@/constants";
import { Badge } from "../shared/badge";
import { Paragraph } from "../shared/paragraph";
import { Title } from "../shared/title";

export const DiscoverSection = () => {
  return (
    <section className="wrapper section mt-6 flex flex-col items-center py-6 lg:py-12">
      <Badge title="Discover" />

      <div className="border-primary bg-secondary/30 grid grid-cols-1 items-center gap-4 rounded-2xl border px-4 py-8 lg:grid-cols-2 lg:gap-8 lg:px-8">
        <div className="space-y-3">
          <Title size="lg">
            Get{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              discovered
            </span>{" "}
            <br /> beyond your <br /> followers
          </Title>

          <Paragraph className="leading-relaxed">
            Your content becomes part <br className="hidden sm:block" /> of a
            living discovery system <br /> - not a static profile page.
          </Paragraph>
        </div>

        <div className="space-y-4">
          {DISCOVER_FEATURES.map((item, index) => (
            <div
              key={index}
              className={`${item.cardClassName} space-y-1 rounded-2xl border-2 border-black p-2`}
            >
              <Paragraph
                weight="bold"
                className={`${item.titleClassName} w-fit rounded-md border px-2 py-1`}
              >
                {item.title}
              </Paragraph>
              <Paragraph
                size="xs"
                className="leading-relaxed"
              >
                {item.content}
              </Paragraph>
            </div>
          ))}
        </div>
      </div>

      <div className="border-primary inline-block w-fit max-w-full self-start border-l-2 py-0 pl-4">
        <Paragraph
          size="sm"
          className="leading-relaxed"
        >
          Your content doesn&apos;t stay confined{" "}
          <br className="inline-block sm:hidden" /> to your audience.{" "}
          <br className="inline-block sm:hidden" /> Tipmanna helps people
          discover creators, <br className="hidden sm:block" />
          communities, events, and experiences through TV Explore, Channels, and
          Tipmanna TV.
        </Paragraph>
      </div>
    </section>
  );
};
