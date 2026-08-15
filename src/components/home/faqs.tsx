import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { FAQAccordion } from "./faq-accordion";

export default function FAQs() {
  return (
    <section
      className="wrapper section py-12"
      id="faq"
    >
      <div className="space-y-3">
        <Title size="lg">
          FAQ<span className="text-primary">s</span>
        </Title>

        <Paragraph color="muted">
          Everything you need to know <br className="inline-block sm:hidden" />{" "}
          about tipmanna
        </Paragraph>
      </div>

      <FAQAccordion />
    </section>
  );
}
