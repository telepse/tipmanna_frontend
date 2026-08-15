import { CONTENT_TO_GROWTH_STEPS } from "@/constants";
import { Badge } from "../shared/badge";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";

export const ContentToGrowth = () => {
  return (
    <section
      className="relative flex w-full min-w-0 flex-col items-center justify-center overflow-x-clip bg-cover bg-fixed bg-center bg-no-repeat py-6 lg:py-12"
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

        {/* Large screens */}
        <div className="hidden w-full grid-cols-1 gap-4 lg:grid lg:grid-cols-3 lg:gap-8">
          {CONTENT_TO_GROWTH_STEPS.map((item, index) => (
            <div
              key={index}
              className="border-primary bg-secondary/30 space-y-4 rounded-2xl border-2 px-4 py-6 shadow lg:py-12"
            >
              <h2 className="text-secondary/50 text-4xl font-bold sm:text-5xl">
                0{index + 1}
              </h2>

              <div className="space-y-2">
                <Paragraph
                  size="xl"
                  weight="bold"
                  className="text-primary"
                >
                  {item.title}
                </Paragraph>

                <Paragraph
                  size="sm"
                  className="leading-relaxed"
                >
                  {item.content}
                </Paragraph>
              </div>
            </div>
          ))}
        </div>

        {/* Small and medium screens */}
        <div className="no-scrollbar hide__scrollbar relative flex w-full max-w-full min-w-0 items-center overflow-x-auto overflow-y-hidden overscroll-x-contain lg:hidden">
          <div className="flex min-w-0 snap-x snap-mandatory gap-4">
            {CONTENT_TO_GROWTH_STEPS.map((item, index) => (
              <div
                key={index}
                className="w-[80%] min-w-[80%] flex-shrink-0 snap-center sm:w-[45%] sm:min-w-[45%]"
              >
                <div className="border-primary bg-secondary/30 flex h-full flex-col space-y-4 rounded-2xl border-2 px-4 py-6 shadow">
                  <h2 className="text-secondary/50 text-4xl font-bold sm:text-5xl">
                    0{index + 1}
                  </h2>

                  <div className="space-y-2">
                    <Paragraph
                      size="xl"
                      weight="bold"
                      className="text-primary"
                    >
                      {item.title}
                    </Paragraph>

                    <Paragraph
                      size="sm"
                      className="leading-relaxed"
                    >
                      {item.content}
                    </Paragraph>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
