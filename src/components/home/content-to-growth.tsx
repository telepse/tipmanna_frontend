import { CONTENT_TO_GROWTH_STEPS } from "@/constants";
import { Badge } from "../shared/badge";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";

function GrowthStepCard({
  item,
  index,
}: {
  item: (typeof CONTENT_TO_GROWTH_STEPS)[number];
  index: number;
}) {
  return (
    <div className="border-primary bg-secondary/30 flex h-full flex-col space-y-4 rounded-2xl border-2 px-4 py-6 shadow lg:py-12">
      <span
        aria-hidden
        className="text-secondary/50 text-4xl font-bold sm:text-5xl"
      >
        0{index + 1}
      </span>

      <div className="space-y-2">
        <Title
          as="h3"
          size="sm"
          weight="bold"
          className="text-primary"
        >
          {item.title}
        </Title>

        <Paragraph
          size="sm"
          className="leading-relaxed"
        >
          {item.content}
        </Paragraph>
      </div>
    </div>
  );
}

export const ContentToGrowth = () => {
  return (
    <section
      className="relative flex w-full min-w-0 flex-col items-center justify-center overflow-x-clip bg-cover bg-center bg-no-repeat py-6 lg:py-12"
      style={{ backgroundImage: `url(/patterns/bg_pattern.webp)` }}
    >
      <div className="wrapper section flex w-full min-w-0 flex-col items-center">
        <Badge title="How it works" />

        <Title
          align="center"
          size="lg"
        >
          From content to growth <br className="hidden sm:inline-block" /> in{" "}
          <br className="sm:inline-block lg:hidden" />
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            three steps
          </span>{" "}
        </Title>

        <div className="no-scrollbar hide__scrollbar relative flex w-full max-w-full min-w-0 items-stretch gap-4 overflow-x-auto overscroll-x-contain lg:grid lg:grid-cols-3 lg:overflow-visible">
          {CONTENT_TO_GROWTH_STEPS.map((item, index) => (
            <div
              key={item.title}
              className="w-[80%] min-w-[80%] flex-shrink-0 snap-center sm:w-[45%] sm:min-w-[45%] lg:w-auto lg:min-w-0"
            >
              <GrowthStepCard
                item={item}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
