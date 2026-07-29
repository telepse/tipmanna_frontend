import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";
import { Badge } from "../shared/badge";

export const TheCoreShift = () => {
  return (
    <section className="mt-6 bg-gradient-to-r from-[#FFECDB] to-[#FF7900] px-4 py-6 lg:mt-12">
      <div className="wrapper section">
        <section className="relative grid grid-cols-1 items-end gap-4 rounded-2xl bg-cover bg-center bg-no-repeat bg-blend-multiply lg:grid-cols-2 lg:gap-8">
          <div className="space-y-4">
            <Badge title="The core shift" />

            <Title
              size="lg"
              className="inline-flex items-center"
            >
              Attention doesn&apos;t <br /> build connection <br />{" "}
              participation does
            </Title>

            <Paragraph>
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

            <div className="border-primary rounded-2xl border p-4 text-sm">
              But when people participate, everything changes.{" "}
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
