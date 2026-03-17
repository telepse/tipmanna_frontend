import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { FAQAccordion } from "./faq-accordion";

export default function FAQs() {
  return (
    <section
      className="wrapper section py-12"
      id="faq"
    >
      <Title size="lg">
        FAQ<span className="text-primary">s</span>
      </Title>

      <Paragraph color="muted">
        Everything you need to know about tipmanna
      </Paragraph>

      <FAQAccordion />
    </section>
  );
}
