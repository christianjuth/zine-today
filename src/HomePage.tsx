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
  ArticlePane,
  WordSearch,
  BookOtdPanel,
} from "./components/panes";
import dayjs from "dayjs";

const TODAY = dayjs().format("YYYY-MM-DD");

function mmToPx(mm: number, dpi = 100): number {
  return Math.round((mm / 25.4) * dpi);
}

// function pxToMm(px: number, dpi = 300): number {
//   return (px / dpi) * 25.4;
// }

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
    try {
      const paneIndex = ctx.pageSetup.translatePaneIndex(i);
      if (_.isNil(paneIndex) || _.isNil(div)) {
        continue;
      }
      const col = paneIndex.index % 4;
      const row = paneIndex.index >= 4 ? 1 : 0;
      await waitForImages(div);
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
    } catch {}
    i++;
  }

  doc.save(`zine-today-${TODAY}.pdf`);
}

const pageSetup = new UsLetter();

export function HomePage() {
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
      <NasaPane index={0} pageSetup={pageSetup} key="nasa" />,
      <SudokuPane index={1} pageSetup={pageSetup} key="sudoku-1" />,
      <WordOfTheDayPane index={2} pageSetup={pageSetup} key="word" />,
      <XkcdPane index={3} pageSetup={pageSetup} key="word" />,
      <ArticlePane
        index={4}
        pageSetup={pageSetup}
        src="https://aeon.co/feed.rss"
        limit={1}
        key="news-0"
      />,
      <WordSearch index={5} pageSetup={pageSetup} key="sudoku-2" />,
      // <SudokuPane index={5} pageSetup={pageSetup} key="sudoku-2" />,
      // <SaturdayMorningComicPane
      //   index={5}
      //   pageSetup={pageSetup}
      //   key="sudoku-2"
      // />,
      // <ArticlePane
      //   index={6}
      //   pageSetup={pageSetup}
      //   src="https://www.newyorker.com/feed/fiction-and-poetry/rss"
      //   limit={4}
      //   key="news-1"
      // />,
      <BookOtdPanel index={6} pageSetup={pageSetup} key="back" />,
      <BackPane index={7} pageSetup={pageSetup} key="back" />,
    ],
    [pageSetup],
  );
  return (
    <>
      <Context.Provider value={{ registerPane }}>
        <div className="flex flex-row flex-wrap text-xs gap-y-5 py-5 justify-center">
          {panes.map((pane, index) => (
            <Fragment key={index}>
              {index % 2 === 1 && <div className="w-5" />}
              {pane}
            </Fragment>
          ))}
        </div>
      </Context.Provider>
      <button
        className="fixed top-5 left-5 z-50 bg-white px-1"
        onClick={() =>
          print({
            divs: divs,
            pageSetup,
          })
        }
      >
        Print
      </button>
    </>
  );
}
