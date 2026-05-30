/** Mirrors backend `tip-config.schema` payload shape for client merges. */

export type TipConfigItem = {
  itemId: string;
  kind: "default" | "premium";
  characterId: string;
  priceMinor: number;
  labelOverride?: string;
  position: number;
};

export type TipConfigTextBlock = {
  enabled: true;
  priceMinor: number;
  maxLength: number;
  priceTouchedByHost: boolean;
};

export type TipConfigPayload = {
  ctaSectionLabel: string;
  ctaPayLabel: string;
  currency: "GBP";
  textCharacter: TipConfigTextBlock;
  sectionItems: TipConfigItem[];
  drawerItems: TipConfigItem[];
};

export type ActiveTipConfigResponse =
  | { mode: "legacy" }
  | {
      mode: "live";
      version: number;
      etag: string;
      reviewNeeded: boolean;
      config: TipConfigPayload;
    };
