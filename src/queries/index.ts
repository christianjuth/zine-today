import { useQuery } from "@tanstack/react-query";
// import { Dayjs } from "dayjs";
import z from "zod";

// const STALE_TIME = {
//   "24_HOURS": 60 * 60 * 24 * 1000,
// };

async function jsonFetch<T extends z.Schema>(
  input: RequestInfo | URL,
  init: RequestInit,
  schema: T,
): Promise<z.infer<T>> {
  const res = await fetch(input, init);
  const data = await res.json();
  return schema.parse(data);
}

const wordOfTheDaySchema = z.object({
  word: z.string(),
  definition: z.string(),
  etymology: z.string(),
});

export function useWorkOfTheDayQuery() {
  const endpoint = "https://wordoftheday.freeapi.me/";
  return useQuery({
    queryKey: [endpoint],
    queryFn: ({ signal }) =>
      jsonFetch(endpoint, { signal }, wordOfTheDaySchema),
  });
}

const xkcdSchema = z.object({
  title: z.string(),
  img: z.string(),
  num: z.number(),
});

export function useXkcdQuery() {
  const endpoint =
    "https://raw.githubusercontent.com/aghontpi/mirror-xkcd-api/main/syncState.json";
  return useQuery({
    queryKey: [endpoint],
    queryFn: async ({ signal }) => {
      const meta = await jsonFetch(
        endpoint,
        { signal },
        z.object({
          last_update_content: z.object({ id: z.string() }),
        }),
      );

      return await jsonFetch(
        `https://raw.githubusercontent.com/aghontpi/mirror-xkcd-api/main/api/${meta.last_update_content.id}/info.0.json`,
        { signal },
        xkcdSchema,
      );
    },
  });
}
