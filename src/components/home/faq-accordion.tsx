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
          <AccordionTrigger>
            Do people need an account to support me?
          </AccordionTrigger>
          <AccordionContent>
            No. People can participate and support instantly. Creating an
            account is optional and can be done later.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2">
          <AccordionTrigger>
            Can people watch my content for free?
          </AccordionTrigger>
          <AccordionContent>
            Yes. Most content on Tipmanna can be watched freely. Support happens
            when people choose to participate, engage, or contribute.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3">
          <AccordionTrigger>What is Community TV?</AccordionTrigger>
          <AccordionContent>
            Community TV gives organisations, communities, clubs, and groups
            their own dedicated 24/7 TV channel within Tipmanna. It can be used
            to showcase content, schedule programs, engage members, and build
            recurring community experiences.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4">
          <AccordionTrigger>Can I offer memberships?</AccordionTrigger>
          <AccordionContent>
            Yes. Community plans allow you to create memberships, offer
            exclusive experiences, and build recurring supporter relationships.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>
            Can I host livestreams and events?
          </AccordionTrigger>
          <AccordionContent>
            Yes. You can host livestreams, virtual events, and community
            experiences through Event Rooms with realtime participation,
            comments, reactions, and supporter engagement.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>How does discovery work?</AccordionTrigger>
          <AccordionContent>
            Your content can be discovered through channels, Explore, featured
            placements, community experiences, and Tipmanna TV, helping you
            reach audiences beyond your existing followers.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>Is Tipmanna only for creators?</AccordionTrigger>
          <AccordionContent>
            No. Tipmanna is built for creators, charities, event organisers,
            faith organisations, universities, clubs, sports communities, and
            anyone looking to bring people together around shared experiences.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5">
          <AccordionTrigger>Is Tipmanna secure?</AccordionTrigger>
          <AccordionContent>
            Yes. Security, privacy, and trusted payment processing are core
            platform priorities. We are committed to providing a safe and
            reliable experience for creators, communities, and supporters.
          </AccordionContent>
        </AccordionItem>
      </div>
    </Accordion>
  );
};
