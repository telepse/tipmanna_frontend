import { DISCOVER_FEATURES } from "@/constants";
import { Badge } from "../shared/badge";
import { Paragraph } from "../shared/paragraph";
import { Title } from "../shared/title";

export const DiscoverSection = () => {
  return (
    <section className="wrapper section flex flex-col items-center">
      <Badge title="Discover" />

      <div className="border-primary bg-secondary/10 grid grid-cols-1 items-center gap-4 rounded-2xl border px-4 py-8 lg:grid-cols-2 lg:gap-8 lg:px-8">
        <div className="space-y-2">
          <Title size="lg">
            Get{" "}
            <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
              discovered
            </span>{" "}
            <br /> beyond your <br /> followers
          </Title>

          <Paragraph size="sm">
            Your content becomes part of a living discovery system{" "}
            <br className="hidden sm:block" /> - not a static profile page.
          </Paragraph>
        </div>

        <div className="space-y-4">
          {DISCOVER_FEATURES.map((item, index) => (
            <div
              key={index}
              className={`${item.cardClassName} border-primary space-y-1 rounded-2xl border-2 p-2`}
            >
              <Paragraph
                weight="bold"
                className={`${item.titleClassName} w-fit rounded-md border px-2 py-1`}
              >
                {item.title}
              </Paragraph>
              <Paragraph size="sm">{item.content}</Paragraph>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
