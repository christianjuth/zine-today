import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

function parseRssDateIgnoringZone(pubDate: string) {
  const withoutZone = pubDate
    .trim()
    .replace(/\s+(?:[A-Z]{1,5}|[+-]\d{4})$/, "");

  return dayjs(withoutZone, "ddd, DD MMM YYYY HH:mm", true);
}

export function stabalizeRssItems<T extends { pubDate?: string }>(
  items: T[] | undefined,
  beforeDate: Dayjs,
): T[] | undefined {
  const filtered = items?.filter((item) =>
    item.pubDate
      ? parseRssDateIgnoringZone(item.pubDate).isBefore(beforeDate)
      : true,
  );
  return filtered?.length ? filtered : items;
}
