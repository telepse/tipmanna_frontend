export function formatDate(isoString: string): string {
  if (!isoString) return "";

  const date = new Date(isoString);

  if (isNaN(date.getTime())) {
    console.warn("Invalid date passed to formatDate:", isoString);
    return "";
  }

  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    date
  );
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}
