import _ from "lodash";
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { Sudoku } from "./Sudoku";
import {
  useRssFeed,
  useQuoteQuery,
  useWorkOfTheDayQuery,
  useXkcdQuery,
} from "../queries";
import { ReactQRCode } from "@lglab/react-qr-code";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

const TODAY = dayjs().format("YYYY-MM-DD");

function mmToPx(mm: number, dpi = 100): number {
  return Math.round((mm / 25.4) * dpi);
}

export abstract class PageSetup {
  abstract panelCount: number;

  abstract rows: number;
  abstract cols: number;

  abstract pageHeightMm: number;
  abstract pageWidthMm: number;

  abstract paneWidth(): number;
  abstract paneHeight(): number;

  abstract paneAspectRatio(): number;

  abstract translatePaneIndex(index: number):
    | {
        index: number;
        rotate180?: boolean;
      }
    | undefined;
}

export class UsLetter implements PageSetup {
  panelCount = 8;
  cols = 4;
  rows = 2;
  pageHeightMm = 215.9;
  pageWidthMm = 279.4;

  paneWidth() {
    return this.pageWidthMm / this.cols;
  }

  paneHeight() {
    return this.pageHeightMm / this.rows;
  }

  paneAspectRatio() {
    return this.paneWidth() / this.paneHeight();
  }

  translatePaneIndex(
    index: number,
  ): { index: number; rotate180?: boolean } | undefined {
    switch (index) {
      case 0:
        return { index: 5 };
      case 1:
        return { index: 6 };
      case 2:
        return { index: 7 };
      case 3:
        return { index: 3, rotate180: true };
      case 4:
        return { index: 2, rotate180: true };
      case 5:
        return { index: 1, rotate180: true };
      case 6:
        return { index: 0, rotate180: true };
      case 7:
        return { index: 4, rotate180: true };
    }
  }
}

export const Context = createContext<{
  registerPane: (index: number, pane: HTMLDivElement) => void;
}>({
  registerPane: _.noop,
});

type PaneProps = {
  index: number;
  pageSetup: PageSetup;
  children: ReactNode;
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
  }, [props.index]);

  return (
    <div
      className="relative"
      ref={ref}
      style={{
        width: mmToPx(pageSetup.paneWidth()),
        height: mmToPx(pageSetup.paneHeight()),
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
  return (
    <Pane {...props}>
      <div className="h-full w-full flex flex-col bg-white p-4 gap-2 items-center justify-center">
        <img src={query.data?.img} />
        <span>{query.data?.title}</span>
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
