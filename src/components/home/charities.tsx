import { SquareArrowOutUpRight } from "lucide-react";

// Local imports
import { Badge } from "@/components/shared/badge";
import { Paragraph } from "@/components/shared/paragraph";
import { Title } from "@/components/shared/title";
import { LogoSlider } from "./logo-slider";
import { Cause } from "@/types/cause.types";

interface Props {
  causes: Cause[];
}

export default function Charities({ causes }: Props) {
  return (
    <section className="section items-center">
      <Badge title="Causes" />

      <Title
        align="center"
        size="lg"
      >
        Causes we <br className="lg:hidden" />{" "}
        <span className="text-primary">give to</span>
      </Title>

      <LogoSlider causes={causes} />

      <Paragraph
        align="center"
        size="sm"
        className="text-moonstone-blue flex items-center gap-2"
      >
        Find out how we give <SquareArrowOutUpRight />
      </Paragraph>
    </section>
  );
}
