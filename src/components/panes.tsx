import _ from "lodash";
import {
  createContext,
  useContext,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

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

  // TODO: revoew object url

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
      <span>Testing 123</span>
    </Pane>
  );
}
