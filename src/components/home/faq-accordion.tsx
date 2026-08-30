import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PARTNER_FAQS } from "@/constants";

export const FAQAccordion = () => {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="item-0"
      className="w-full"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {PARTNER_FAQS.map((faq, index) => (
          <AccordionItem
            key={faq.question}
            value={`item-${index}`}
          >
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </div>
    </Accordion>
  );
};
