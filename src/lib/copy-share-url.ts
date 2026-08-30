/** Copy a share URL to the clipboard with a legacy fallback. */
export async function copyShareUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;

  try {
    await navigator.clipboard.writeText(trimmed);
    return;
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = trimmed;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  }
}
