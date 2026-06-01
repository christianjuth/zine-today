import _ from "lodash";
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { Sudoku } from "./Sudoku";
import { useWorkOfTheDayQuery, useXkcdQuery } from "../queries";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

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
  return (
    <Pane {...props}>
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src="https://api.nasapicture.com/optimized"
      />
      <span className="absolute bottom-2 left-2 font-black bg-white px-1 py-0.5">
        {dayjs().format("ddd, LL")}
      </span>
    </Pane>
  );
}

export function SudokuPane(props: Omit<PaneProps, "children">) {
  return (
    <Pane {...props}>
      <div className="h-full w-full flex flex-col items-center justify-around bg-white">
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
