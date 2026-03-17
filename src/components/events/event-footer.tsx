import { TipSection } from "./tip-section";

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
}

interface Props {
  eventId: string;
  tippingCharacters: Character[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  characterSets: any;
}

export const EventFooter = ({
  eventId,
  tippingCharacters,
  characterSets,
}: Props) => {
  return (
    <div className="mini-wrapper h-[248px] w-full flex-shrink-0 rounded-t-xl border-t bg-white px-4 py-1 shadow-sm">
      <div className="mt-1">
        <TipSection
          eventId={eventId}
          tippingCharacters={tippingCharacters}
          characterSets={characterSets}
        />
      </div>
    </div>
  );
};
