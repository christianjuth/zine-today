import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import _ from "lodash";
import { useState, useCallback, Fragment, useMemo } from "react";
import {
  Context,
  NasaPane,
  PageSetup,
  SudokuPane,
  UsLetter,
  WordOfTheDayPane,
  XkcdPane,
  BackPane,
  WordSearch,
  BookOtdPanel,
} from "./components/panes/index";
import { TODAY, TODAY_STR, YESTERDAY } from "./lib/date";
import { issueNumber } from "./lib/issue-number";
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);
import dayjs, { Dayjs } from "dayjs";

function mmToPx(mm: number, dpi = 100): number {
  return Math.round((mm / 25.4) * dpi);
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(async (img) => {
      if (!img.complete || img.naturalWidth === 0) {
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => {
            cleanup();
            resolve();
          };

          const onError = () => {
            cleanup();
            reject(new Error(`Image failed to load: ${img.src}`));
          };

          const cleanup = () => {
            img.removeEventListener("load", onLoad);
            img.removeEventListener("error", onError);
          };

          img.addEventListener("load", onLoad);
          img.addEventListener("error", onError);
        });
      }

      await img.decode().catch(() => {});
    }),
  );
}

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

async function print(ctx: { divs: HTMLDivElement[]; pageSetup: PageSetup }) {
  const marginMm = ctx.pageSetup.pageMarginMm();

  const pageWidthMm = ctx.pageSetup.pageWidthMm();
  const pageHeightMm = ctx.pageSetup.pageHeightMm();

  const paneWidthMm = ctx.pageSetup.paneWidthMm();
  const paneHeightMm = ctx.pageSetup.paneHeightMm();

  const rows = ctx.pageSetup.rows;
  const cols = ctx.pageSetup.cols;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [pageWidthMm + marginMm * 2, pageHeightMm + marginMm * 2],
  });

  let i = 0;
  for (const div of ctx.divs.slice(0, pageSetup.panelCount)) {
    try {
      const paneIndex = ctx.pageSetup.translatePaneIndex(i);
      if (_.isNil(paneIndex) || _.isNil(div)) {
        continue;
      }
      const col = paneIndex.index % 4;
      const row = paneIndex.index >= 4 ? 1 : 0;
      await waitForImages(div);
      let img = await toPng(div, {
        height: mmToPx(paneHeightMm),
        width: mmToPx(paneWidthMm),
      });

      if (paneIndex.rotate180) {
        img = await rotate(img, 180);
      }

      doc.addImage(
        img,
        "png",
        col * paneWidthMm + marginMm,
        row * paneHeightMm + marginMm,
        paneWidthMm,
        paneHeightMm,
      );
    } catch (err) {
      console.error(err);
    }
    i++;
  }

  for (let r = 1; r < rows; r++) {
    doc.line(
      marginMm,
      paneHeightMm * r + marginMm,
      pageWidthMm + marginMm,
      paneHeightMm * r + marginMm,
    );
  }

  for (let c = 1; c < cols; c++) {
    doc.line(
      paneWidthMm * c + marginMm,
      marginMm,
      paneWidthMm * c + marginMm,
      pageHeightMm + marginMm,
    );
  }

  doc.save(`zine-today-${TODAY_STR}.pdf`);
}

const pageSetup = new UsLetter();

function ZineSection({ date }: { date: Dayjs }) {
  const [divs, setDivs] = useState<HTMLDivElement[]>([]);
  const registerPane = useCallback(
    (index: number, pane: HTMLDivElement) =>
      setDivs((prev) => {
        const clone = [...prev];
        clone[index] = pane;
        return clone;
      }),
    [],
  );
  const panes = useMemo(
    () => [
      <NasaPane index={0} pageSetup={pageSetup} key="nasa" date={date} />,
      <SudokuPane index={1} pageSetup={pageSetup} key="sudoku-1" date={date} />,
      <WordOfTheDayPane
        index={2}
        pageSetup={pageSetup}
        key="word"
        date={date}
      />,
      <SudokuPane index={3} pageSetup={pageSetup} key="sudoku-2" date={date} />,
      <XkcdPane index={4} pageSetup={pageSetup} key="word" date={date} />,
      <WordSearch index={5} pageSetup={pageSetup} key="sudoku-2" date={date} />,
      <BookOtdPanel index={6} pageSetup={pageSetup} key="back" date={date} />,
      <BackPane index={7} pageSetup={pageSetup} key="back" date={date} />,
    ],
    [pageSetup],
  );
  return (
    <div className="flex flex-row min-h-[100lvh]">
      <Context.Provider value={{ registerPane }}>
        <div className="flex flex-row flex-wrap gap-y-5 py-5 items-center justify-center bg-neutral-800">
          <div className="flex flex-row flex-wrap gap-y-5 justify-center">
            {panes.map((pane, index) => (
              <Fragment key={index}>
                {index % 2 === 1 && <div className="w-4" />}
                {pane}
              </Fragment>
            ))}
          </div>
        </div>
      </Context.Provider>
      <div className="h-[100lvh] min-w-90 max-w-90 bg-black text-white">
        <div className="sticky top-0 p-6 flex flex-col gap-6">
          {date.isSame(TODAY, "date") && (
            <h1 className="font-black text-xl">Zine.today</h1>
          )}
          {date.isSame(YESTERDAY, "date") && (
            <h1 className="font-black text-xl">Zine Yesterday</h1>
          )}
          <h2 className="font-bold">
            {date.format("ddd ll")}, Issue #{issueNumber(date)}
          </h2>
          <h2>Step 1. Print</h2>
          <button
            className="bg-white text-black px-1"
            onClick={() =>
              print({
                divs: divs,
                pageSetup,
              })
            }
          >
            Print
          </button>
          <h2>Step 2. Fold</h2>
          <iframe
            src="https://www.youtube.com/embed/o20s2JNyBtI"
            className="w-full aspect-video"
          />
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <ZineSection date={TODAY} />
      <ZineSection date={TODAY.subtract(1, "day")} />
    </>
  );
}
