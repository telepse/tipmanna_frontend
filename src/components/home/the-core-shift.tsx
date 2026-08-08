import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";
import { Badge } from "../shared/badge";

export const TheCoreShift = () => {
  return (
    <section className="mt-6 min-h-[80vh] bg-gradient-to-r from-[#FFF] via-[#f7c87c] to-[#FF7900] px-4 py-6 lg:mt-12 lg:py-12">
      <div className="wrapper section">
        <section className="relative mt-6 grid grid-cols-1 items-end gap-4 rounded-2xl bg-cover bg-center bg-no-repeat bg-blend-multiply lg:grid-cols-2 lg:gap-8">
          <div className="space-y-4">
            <Badge
              title="The core shift"
              isWhite={true}
            />

            <Title
              size="lg"
              className=""
            >
              <span>Attention doesn&apos;t</span> <br /> build connection <br />{" "}
              <span className="bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
                participation
              </span>{" "}
              does
            </Title>

            <Paragraph
              weight="bold"
              className="leading-relaxed"
            >
              Tipmanna is built on one idea: <br /> turn attention into
              participation
            </Paragraph>
          </div>

          <div className="border-primary max-w-md space-y-4 justify-self-end rounded-2xl border-2 bg-white p-4">
            <div className="space-y-2">
              <Paragraph
                size="lg"
                weight="bold"
              >
                Views are easy
              </Paragraph>
              <Paragraph>Followers are passive.</Paragraph>
              <Paragraph color="muted">Attention fades quickly.</Paragraph>
            </div>

            <div className="border-primary bg-secondary/30 rounded-2xl border p-4 text-sm">
              <span className="font-semibold">
                But when people participate, everything changes.
              </span>{" "}
              <br className="hidden lg:block" /> They react. They engage. They
              feel part of it. And <br className="hidden lg:block" /> when
              people feel part of something, they return.
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};
