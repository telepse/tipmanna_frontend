/* eslint-disable @typescript-eslint/no-explicit-any */
import { TipSection } from "./tip-section";
import type { TipQuoteContext } from "@/hooks/use-tip-presentation";

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
}

interface Props {
  eventId: string;
  tippingCharacters: Character[];

  characterSets: any;
  performers: any[];
  projects?: any[];
  contributionType?: string;
  textTipUnitPrice?: number;
  sectionCtaLabel?: string;
  payLabel?: string;
  tipQuoteContext?: TipQuoteContext | null;
  eliteCharacterIds?: string[];
  openTipDrawerNonce?: number;
  preserveStripOrder?: boolean;
  stripCharacters?: Character[];
}

export const EventFooter = ({
  eventId,
  tippingCharacters,
  characterSets,
  performers,
  projects,
  contributionType,
  textTipUnitPrice,
  sectionCtaLabel,
  payLabel,
  tipQuoteContext,
  eliteCharacterIds,
  openTipDrawerNonce,
  preserveStripOrder,
  stripCharacters,
}: Props) => {
  return (
    <div className="mini-wrapper h-[210px] w-full flex-shrink-0 rounded-t-xl border-t bg-white px-4 py-1 shadow-sm">
      <div className="mt-1">
        <TipSection
          eventId={eventId}
          tippingCharacters={tippingCharacters}
          characterSets={characterSets}
          performers={performers}
          projects={projects}
          contributionType={contributionType}
          textTipUnitPrice={textTipUnitPrice}
          sectionCtaLabel={sectionCtaLabel}
          payLabel={payLabel}
          tipQuoteContext={tipQuoteContext}
          eliteCharacterIds={eliteCharacterIds}
          openTipDrawerNonce={openTipDrawerNonce}
          preserveStripOrder={preserveStripOrder}
          stripCharacters={stripCharacters}
        />
      </div>
    </div>
  );
};
