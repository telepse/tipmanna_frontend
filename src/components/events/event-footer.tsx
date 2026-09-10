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
  textTipUnitPrice?: number;
  sectionCtaLabel?: string;
  payLabel?: string;
  tipQuoteContext?: TipQuoteContext | null;
  eliteCharacterIds?: string[];
  openTipDrawerNonce?: number;
}

export const EventFooter = ({
  eventId,
  tippingCharacters,
  characterSets,
  performers,
  textTipUnitPrice,
  sectionCtaLabel,
  payLabel,
  tipQuoteContext,
  eliteCharacterIds,
  openTipDrawerNonce,
}: Props) => {
  return (
    <div className="mini-wrapper h-[210px] w-full flex-shrink-0 rounded-t-xl border-t bg-white px-4 py-1 shadow-sm">
      <div className="mt-1">
        <TipSection
          eventId={eventId}
          tippingCharacters={tippingCharacters}
          characterSets={characterSets}
          performers={performers}
          textTipUnitPrice={textTipUnitPrice}
          sectionCtaLabel={sectionCtaLabel}
          payLabel={payLabel}
          tipQuoteContext={tipQuoteContext}
          eliteCharacterIds={eliteCharacterIds}
          openTipDrawerNonce={openTipDrawerNonce}
        />
      </div>
    </div>
  );
};
