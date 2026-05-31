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
} from "react";

async function rotate180(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  ctx.translate(img.width, img.height);
  ctx.rotate(Math.PI);
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL("image/png");
}

abstract class PageSetup {
  abstract pannelCount: number;

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
        flip?: boolean;
      }
    | undefined;
}

class UsLetter implements PageSetup {
  pannelCount = 8;
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
  ): { index: number; flip?: boolean } | undefined {
    switch (index) {
      case 0:
        return { index: 5 };
      case 1:
        return { index: 6 };
      case 2:
        return { index: 7 };
      case 3:
        return { index: 3, flip: true };
      case 4:
        return { index: 2, flip: true };
      case 5:
        return { index: 1, flip: true };
      case 6:
        return { index: 0, flip: true };
      case 7:
        return { index: 4, flip: true };
    }
  }
}

async function print(ctx: { images: HTMLDivElement[]; pageSetup: PageSetup }) {
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
  for (const div of ctx.images) {
    const paneIndex = ctx.pageSetup.translatePaneIndex(i);
    if (_.isNil(paneIndex)) {
      continue;
    }
    const col = paneIndex.index % 4;
    const row = paneIndex.index >= 4 ? 1 : 0;
    let img = await toPng(div);

    if (paneIndex.flip) {
      img = await rotate180(img);
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
      className="w-50"
      ref={ref}
      style={{
        aspectRatio: props.pageSetup.paneAspectRatio(),
        backgroundColor: props.index % 2 === 0 ? "black" : "white",
        color: props.index % 2 === 0 ? "white" : "black",
      }}
    >
      Pane {props.index}
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
        <div className="grid grid-cols-4 w-200 border">
          {Array.from({ length: 8 })
            .fill(0)
            .map((_num, index) => (
              <Pane key={index} index={index} pageSetup={pageSetup} />
            ))}
        </div>
      </Context.Provider>
      <button
        onClick={() =>
          print({
            images: _.compact(panes),
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
