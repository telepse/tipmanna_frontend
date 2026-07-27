import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";

export const TheCoreShift = () => {
  return (
    <div className="wrapper px-4 py-12">
      <section className="section relative grid min-h-[60vh] grid-cols-2 gap-8 rounded-2xl bg-cover bg-center bg-no-repeat bg-blend-multiply">
        <div>
          <Title
            size="lg"
            className="mt-6 inline-flex items-center"
          >
            Attention doesn&apos;t <br /> build connection <br /> participation
            does
          </Title>

          <Paragraph>
            Tipmanna is built on one idea: turn attention into participation
          </Paragraph>
        </div>
      </section>
    </div>
  );
};
