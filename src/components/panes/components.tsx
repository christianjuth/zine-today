import _ from "lodash";
import {
  useContext,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
  useState,
} from "react";
import { Sudoku } from "../Sudoku";
import {
  useRssFeed,
  useQuoteQuery,
  useWorkOfTheDayQuery,
  useXkcdQuery,
  useMuseumQuery,
} from "../../queries";
import { ReactQRCode } from "@lglab/react-qr-code";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { generateWordSearch } from "../../lib/word-search";
import { Context, type PageSetup } from "./panes";
import { TODAY } from "../../lib/date";
import { cn } from "../../lib/utils";
dayjs.extend(localizedFormat);

function mmToPx(mm: number, dpi = 100): number {
  return Math.round((mm / 25.4) * dpi);
}

type PaneProps = {
  index: number;
  pageSetup: PageSetup;
  children: ReactNode;
  className?: string;
};

function Pane(props: PaneProps) {
  const { pageSetup } = props;
  const ref = useRef<HTMLDivElement>(null);
  const { registerPane } = useContext(Context);

  useEffect(() => {
    const div = ref.current;
    if (div) {
      registerPane(props.index, div);
    }
  }, [props.index, registerPane]);

  return (
    <div
      className={"relative " + props.className}
      ref={ref}
      style={{
        width: mmToPx(pageSetup.paneWidthMm()),
        height: mmToPx(pageSetup.paneHeightMm()),
        aspectRatio: pageSetup.paneAspectRatio(),
      }}
    >
      {props.children}
    </div>
  );
}

export function NasaPane(props: Omit<PaneProps, "children">) {
  const [feed] = useRssFeed("https://www.nasa.gov/feeds/iotd-feed/");
  return (
    <Pane {...props}>
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src={feed?.items?.[0].enclosures?.[0].url}
      />
      <span className="absolute bottom-2 left-2 font-black bg-gray-950 text-white px-1 py-0.5">
        {dayjs().format("ddd, LL")}
      </span>
    </Pane>
  );
}

export function SudokuPane(props: Omit<PaneProps, "children">) {
  const [feed] = useRssFeed("https://www.nasa.gov/feeds/iotd-feed/");
  return (
    <Pane {...props}>
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src={feed?.items?.[props.index].enclosures?.[0].url}
      />
      <div className="h-full w-full flex flex-col items-center justify-around relative">
        <Sudoku offset={props.index + 0.1} />
        <Sudoku offset={props.index + 0.2} />
      </div>
    </Pane>
  );
}

export function WordOfTheDayPane(props: Omit<PaneProps, "children">) {
  const query = useWorkOfTheDayQuery();
  return (
    <Pane {...props}>
      <div className="h-full w-full flex flex-col bg-white px-4 gap-6 justify-center">
        <span className="text-lg font-black capitalize">
          {query.data?.word}
        </span>
        <span className="capitalize">{query.data?.definition}</span>
        <span>Etymology: {query.data?.etymology}</span>
      </div>
    </Pane>
  );
}

export function XkcdPane(props: Omit<PaneProps, "children">) {
  const query = useXkcdQuery();
  const [ar, setAr] = useState(1);
  const isLandscape = ar > 1;
  const paneHeight = mmToPx(props.pageSetup.paneHeightMm());
  const paneWidth = mmToPx(props.pageSetup.paneWidthMm());
  return (
    <Pane {...props} className="bg-white">
      <div
        style={
          isLandscape
            ? {
                width: paneHeight,
                height: paneWidth,
              }
            : undefined
        }
        className={cn(
          "pointer-events-none h-full w-full",
          isLandscape && "-rotate-90 origin-top-left",
        )}
      >
        <img
          src={query.data?.img}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            setAr(img.naturalWidth / img.naturalHeight);
          }}
          className={cn(
            "h-full w-full object-contain p-3",
            isLandscape && "-translate-x-full ",
          )}
        />
      </div>
    </Pane>
  );
}

export function QuotePane(props: Omit<PaneProps, "children">) {
  const query = useQuoteQuery();
  const quote = query.data?.data[0];
  return (
    <Pane {...props}>
      <blockquote className="h-full w-full flex flex-col bg-white p-6 justify-around">
        <svg
          className="w-9 h-9 text-heading mb-4"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 11V8a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1Zm0 0v2a4 4 0 0 1-4 4H5m14-6V8a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1Zm0 0v2a4 4 0 0 1-4 4h-1"
          />
        </svg>

        <p className="text-base italic">{quote?.quote}</p>

        <span className="text-base-content/50 text-base font-semibold">
          ~ {quote?.author}
        </span>
      </blockquote>
    </Pane>
  );
}

export function ArticlePane(
  props: Omit<PaneProps, "children"> & { src: string; limit: number },
) {
  const [feed] = useRssFeed(props.src);
  return (
    <Pane {...props}>
      <div className="bg-white h-full p-4 flex flex-col gap-3 justify-between">
        {feed?.items?.slice(0, props.limit).map((item, i) => (
          <div key={i} className="flex flex-col gap-2">
            <span className="font-bold">{item.title}</span>
            {item.description && (
              <div
                // TODO: clean html
                dangerouslySetInnerHTML={{ __html: item.description }}
                className="flex flex-col gap-2"
              />
            )}
          </div>
        ))}
      </div>
    </Pane>
  );
}

export function BackPane(props: Omit<PaneProps, "children">) {
  const query = useQuoteQuery();
  const quote = query.data?.data[0];
  return (
    <Pane {...props}>
      <div className="bg-gray-950 h-full p-4 text-white flex flex-col items-end justify-between">
        <blockquote className="flex flex-col gap-2">
          <p className="text-sm italic text-gray-200">{quote?.quote}</p>

          <span className="text-base font-semibold text-gray-400">
            ~ {quote?.author}
          </span>
        </blockquote>

        <div>
          <span className="font-bold mb-1 block text-end text-gray-400">
            Solutions
          </span>
          <ReactQRCode
            value={`${location.href}?solutions=${TODAY}`}
            marginSize={0}
            size={100}
            dataModulesSettings={{ color: "var(--color-gray-400)" }}
            finderPatternInnerSettings={{ color: "var(--color-gray-400)" }}
            finderPatternOuterSettings={{ color: "var(--color-gray-400)" }}
          />
        </div>
      </div>
    </Pane>
  );
}

export function SaturdayMorningComicPane(props: Omit<PaneProps, "children">) {
  const [items] = useRssFeed(
    "https://www.comicsrss.com/rss/ninechickweedlane.rss",
  );
  const item = items?.items?.[3];
  const paneHeight = mmToPx(props.pageSetup.paneHeightMm());
  const paneWidth = mmToPx(props.pageSetup.paneWidthMm());
  return (
    <Pane {...props} className="bg-white">
      {item?.description && (
        <div
          // TODO: clean html
          dangerouslySetInnerHTML={{ __html: item.description }}
          className="flex flex-col justify-center gap-2 p-2 rotate-90 origin-top-left"
          style={{
            width: paneHeight,
            height: paneWidth,
            transform: `translate(0, -${paneWidth}px)`,
          }}
        />
      )}
    </Pane>
  );
}

export function WordSearch(props: Omit<PaneProps, "children">) {
  const [feed] = useRssFeed("https://www.nasa.gov/feeds/iotd-feed/");
  const nasaImg = feed?.items?.[props.index];
  const wordOfTheDayQuery = useWorkOfTheDayQuery();
  const xkcdQuery = useXkcdQuery();
  const xkcdWords = useMemo(
    () => xkcdQuery.data?.title.split(" ") ?? [],
    [xkcdQuery.data],
  );

  const museumQuery = useMuseumQuery();
  const museumWords = useMemo(
    () => museumQuery.data?.data[0].artist_title.split(" ") ?? [],
    [museumQuery.data],
  );

  const puzzle = useMemo(
    () =>
      generateWordSearch(
        _.compact([wordOfTheDayQuery.data?.word, ...xkcdWords, ...museumWords]),
        TODAY,
        {
          rows: 15,
          cols: 11,
        },
      ),
    [wordOfTheDayQuery.data, xkcdWords, museumWords],
  );

  return (
    <Pane {...props} className="bg-white flex flex-col">
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src={nasaImg?.enclosures?.[0].url}
      />
      <div className="flex-1 flex justify-center items-center">
        <div className="inline-block border-b-2 border-r-2 border-gray-800 bg-white relative">
          {puzzle.grid.map((row, y) => (
            <div key={y} className="flex">
              {row.map((cell, x) => (
                <div
                  key={x}
                  className="flex h-5.5 w-5.5 items-center justify-center text-base font-medium text-gray-800 uppercase select-none border-t border-l border-gray-800"
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <ul className="bg-white relative py-1 px-2 grid grid-cols-2 m-3.5 mt-0 border">
        {puzzle.placements.map((placement, index) => (
          <li key={placement.word}>
            {index + 1}. {placement.word}{" "}
          </li>
        ))}
      </ul>
    </Pane>
  );
}

export function BookOtdPanel(props: Omit<PaneProps, "children">) {
  const query = useMuseumQuery();
  const item = query.data?.data[0];
  const imgSrc = `${query.data?.config.iiif_url}/${item?.image_id}/full/400,/0/default.jpg`;
  return (
    <Pane
      {...props}
      className="flex flex-col bg-white p-4 gap-2 items-center justify-center"
    >
      <div className="overflow-hidden">
        <img src={imgSrc} className="h-full object-contain" />
      </div>
      <span>{item?.title}</span>
      <span>{item?.artist_title}</span>
      <span>{item?.date_display}</span>
    </Pane>
  );
}
