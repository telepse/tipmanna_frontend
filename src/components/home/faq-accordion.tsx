import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQAccordion = () => {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="item-1"
      className="w-full"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AccordionItem value="item-1">
          <AccordionTrigger>Do I need an account to Tip?</AccordionTrigger>
          <AccordionContent>
            No, you don’t need to create an account with Tipmanna to tip — you
            can send tips instantly without signing up.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>Are tips instant?</AccordionTrigger>
          <AccordionContent>
            Yes, tips are processed instantly and sent to host.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>
            Can I watch content without tipping?
          </AccordionTrigger>
          <AccordionContent>
            Yes, you can watch without tipping.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>
            Can I host multiple Events and Contents?
          </AccordionTrigger>
          <AccordionContent>
            Yes, you can host multiple events and contents at the same time.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>How does Tipmanna ensure safety?</AccordionTrigger>
          <AccordionContent>
            We use industry-standard encryption and safety checks.
          </AccordionContent>
        </AccordionItem>
      </div>
    </Accordion>
  );
};
