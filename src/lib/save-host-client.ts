import {
  fetchSavedHostStatusAction,
  fetchSavedHostsMeAction,
  getHostIdForChannelAction,
  saveHostAction,
  unsaveHostAction,
  type SavedHostRow,
} from "@/actions/saved-hosts";

export type { SavedHostRow };

export async function fetchSavedHostsMe(): Promise<SavedHostRow[]> {
  const res = await fetchSavedHostsMeAction();
  if (!res.success || !res.data) return [];
  return res.data.hosts ?? [];
}

export async function fetchSavedHostStatus(hostId: string): Promise<boolean> {
  const res = await fetchSavedHostStatusAction(hostId);
  if (!res.success || !res.data) return false;
  return Boolean(res.data.saved);
}

export async function saveHostRequest(hostId: string): Promise<boolean> {
  const res = await saveHostAction(hostId);
  return res.success;
}

export async function getHostIdForChannel(
  channelId: string
): Promise<string | null> {
  const res = await getHostIdForChannelAction(channelId);
  if (!res.success || !res.data) return null;
  return res.data.hostId;
}

export async function unsaveHostRequest(hostId: string): Promise<boolean> {
  const res = await unsaveHostAction(hostId);
  return res.success;
}
