import {
  isKnownAnimationStyleName,
  type StyleCharacter,
} from "@/lib/animation-style-registry";

/** Styles that operate without a per-character icon URL at resolution time. */
const STYLES_WITHOUT_REQUIRED_ICON = new Set(["Confetti", "Luxurious"]);

export function styleRequiresCharacterIcon(styleName: string): boolean {
  return !STYLES_WITHOUT_REQUIRED_ICON.has(styleName);
}

/** Cart uses "Comment"; catalog often uses "Add Comment". */
export function isTextTipName(name: string): boolean {
  const n = name.trim();
  return n === "Comment" || n === "Add Comment";
}

export function lookupLocalRoomCharacter(
  name: string,
  characterMap: Map<string, import("@/types").RoomCharacter>
): import("@/types").RoomCharacter | undefined {
  const direct = characterMap.get(name);
  if (direct) return direct;

  if (isTextTipName(name)) {
    return characterMap.get("Comment") ?? characterMap.get("Add Comment");
  }

  return undefined;
}

export function resolveCharacterIconUrl(
  name: string,
  styleName: string,
  serverIconUrl: string | undefined,
  characterMap: Map<string, import("@/types").RoomCharacter>
): string {
  const trimmedServer = serverIconUrl?.trim() ?? "";
  if (trimmedServer) return trimmedServer;
  return lookupLocalRoomCharacter(name, characterMap)?.iconUrl?.trim() ?? "";
}

export type CharacterResolutionOutcome =
  | "server_resolved"
  | "local_fallback"
  | "unresolved_character"
  | "invalid_style"
  | "missing_required_icon";

export interface CharacterResolutionEntry {
  name: string;
  outcome: CharacterResolutionOutcome;
  styleName: string | null;
  iconUrl: string;
  /** Populated when the character is runnable after resolution. */
  character?: StyleCharacter;
}

export interface PaymentBundleResolutionSummary {
  expectedCount: number;
  serverResolvedCount: number;
  localFallbackCount: number;
  runnableCount: number;
  rejectedCount: number;
  unresolvedCount: number;
  missingIconCount: number;
  entries: CharacterResolutionEntry[];
}

export function buildRunnableCharacter(
  entry: CharacterResolutionEntry
): StyleCharacter | null {
  if (!entry.character) return null;
  return entry.character;
}

export function countResolutionSummary(
  entries: CharacterResolutionEntry[]
): Omit<
  PaymentBundleResolutionSummary,
  "expectedCount" | "entries" | "runnableCount" | "rejectedCount"
> {
  let serverResolvedCount = 0;
  let localFallbackCount = 0;
  let unresolvedCount = 0;
  let missingIconCount = 0;

  for (const entry of entries) {
    switch (entry.outcome) {
      case "server_resolved":
        serverResolvedCount += 1;
        break;
      case "local_fallback":
        localFallbackCount += 1;
        break;
      case "unresolved_character":
        unresolvedCount += 1;
        break;
      case "missing_required_icon":
        missingIconCount += 1;
        break;
      case "invalid_style":
        unresolvedCount += 1;
        break;
      default:
        break;
    }
  }

  return {
    serverResolvedCount,
    localFallbackCount,
    unresolvedCount,
    missingIconCount,
  };
}
