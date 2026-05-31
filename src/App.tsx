import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import _ from "lodash";
import {
  useState,
  createContext,
  useCallback,
  useContext,
  useRef,
  useEffect,
  Fragment,
} from "react";

function mmToPx(mm: number, dpi = 100): number {
  return Math.round((mm / 25.4) * dpi);
}

// function pxToMm(px: number, dpi = 300): number {
//   return (px / dpi) * 25.4;
// }

async function rotate(dataUrl: string, degrees: number): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  ctx.translate(img.width, img.height);
  ctx.rotate((degrees * Math.PI) / degrees);
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL("image/png");
}

abstract class PageSetup {
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

class UsLetter implements PageSetup {
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

async function print(ctx: { divs: HTMLDivElement[]; pageSetup: PageSetup }) {
  const pageWidthMm = ctx.pageSetup.pageWidthMm;
  const pageHeightMm = ctx.pageSetup.pageHeightMm;

  const paneWidth = ctx.pageSetup.paneWidth();
  const paneHeight = ctx.pageSetup.paneHeight();

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
  });

  let i = 0;
  for (const div of ctx.divs.slice(0, pageSetup.panelCount)) {
    const paneIndex = ctx.pageSetup.translatePaneIndex(i);
    if (_.isNil(paneIndex) || _.isNil(div)) {
      continue;
    }
    const col = paneIndex.index % 4;
    const row = paneIndex.index >= 4 ? 1 : 0;
    let img = await toPng(div, {
      height: mmToPx(paneHeight),
      width: mmToPx(paneWidth),
    });

    if (paneIndex.rotate180) {
      img = await rotate(img, 180);
    }

    doc.addImage(
      img,
      "png",
      col * paneWidth,
      row * paneHeight,
      paneWidth,
      paneHeight,
    );
    i++;
  }

  doc.save("a4.pdf");
}

const Context = createContext<{
  registerPane: (index: number, pane: HTMLDivElement) => void;
}>({
  registerPane: _.noop,
});

function Pane(props: { index: number; pageSetup: PageSetup }) {
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
      className="p-2"
      ref={ref}
      style={{
        width: mmToPx(pageSetup.paneWidth()),
        height: mmToPx(pageSetup.paneHeight()),
        aspectRatio: pageSetup.paneAspectRatio(),
        backgroundColor: props.index % 2 === 0 ? "black" : "white",
        color: props.index % 2 === 0 ? "white" : "black",
      }}
    >
      {props.index === 0 ? "Cover" : `Page ${props.index}`}
    </div>
  );
}

const pageSetup = new UsLetter();

function App() {
  const [panes, setPanes] = useState<HTMLDivElement[]>([]);
  const registerPane = useCallback(
    (index: number, pane: HTMLDivElement) =>
      setPanes((prev) => {
        const clone = [...prev];
        clone[index] = pane;
        return clone;
      }),
    [],
  );
  return (
    <>
      <Context.Provider value={{ registerPane }}>
        <div className="grid grid-cols-2 w-max mx-auto text-xs gap-y-5 py-5">
          {Array.from({ length: 8 })
            .fill(0)
            .map((_num, index) => (
              <Fragment key={index}>
                <Pane index={index} pageSetup={pageSetup} />
                {index === 0 && <div />}
              </Fragment>
            ))}
        </div>
      </Context.Provider>
      <button
        className="fixed top-5 left-5"
        onClick={() =>
          print({
            divs: panes,
            pageSetup,
          })
        }
      >
        Print
      </button>
    </>
  );
}

export default App;
