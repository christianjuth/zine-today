import { useQuery } from "@tanstack/react-query";
import { parseRssFeed } from "feedsmith";
import { useMemo } from "react";
// import { Dayjs } from "dayjs";
import z from "zod";
import { issueNumber } from "../lib/issue-number";

async function textFetch(input: RequestInfo | URL, init: RequestInit) {
  const res = await fetch(input, init);
  return await res.text();
}

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

const quoteSchema = z.object({
  data: z.array(
    z.object({
      quote: z.string(),
      author: z.string(),
    }),
  ),
});

export function useQuoteQuery() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const params = new URLSearchParams({
    order: "random",
    seed: today,
    limit: "1",
    min_len: "50",
    max_len: "300",
    category: "motivation",
  });
  const endpoint = `https://quotesapi.prayushadhikari.com.np/api/quotes?${params}`;
  return useQuery({
    queryKey: [endpoint],
    queryFn: ({ signal }) => jsonFetch(endpoint, { signal }, quoteSchema),
  });
}

export function useRssFeed(url: string) {
  const query = useQuery({
    queryKey: [url],
    queryFn: ({ signal }) => textFetch(url, { signal }),
  });
  const feed = useMemo(
    () => (query.data ? parseRssFeed(query.data) : null),
    [query.data],
  );
  return [feed, query] as const;
}

const museumSchema = z.object({
  data: z.array(
    z.object({
      title: z.string(),
      artist_title: z.string(),
      image_id: z.string(),
      thumbnail: z.object({ lqip: z.string() }),
      date_display: z.string(),
    }),
  ),
  config: z.object({
    iiif_url: z.string(),
  }),
});

export function useMuseumQuery() {
  const params = {
    query: {
      bool: {
        must: [
          { term: { is_public_domain: true } },
          { exists: { field: "image_id" } },
        ],
      },
    },
    sort: [{ id: { order: "asc" } }],
    from: issueNumber(),
    size: 1,
    fields: [
      "id",
      "title",
      "artist_title",
      "date_display",
      "image_id",
      "is_public_domain",
      "thumbnail",
    ],
  };
  const endpoint = `https://api.artic.edu/api/v1/artworks/search?params=${encodeURIComponent(JSON.stringify(params))}`;
  return useQuery({
    queryKey: [endpoint],
    queryFn: ({ signal }) => jsonFetch(endpoint, { signal }, museumSchema),
    staleTime: 0,
  });
}
