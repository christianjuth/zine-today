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
