import _ from "lodash";
import { createContext } from "react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
dayjs.extend(localizedFormat);

export abstract class PageSetup {
  abstract panelCount: number;

  abstract rows: number;
  abstract cols: number;

  abstract _margin: number;
  abstract _pageHeightMm: number;
  abstract _pageWidthMm: number;

  abstract pageMarginMm(): number;

  abstract pageHeightMm(): number;
  abstract pageWidthMm(): number;

  abstract paneWidthMm(): number;
  abstract paneHeightMm(): number;

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
  _margin = 4;
  _pageHeightMm = 215.9;
  _pageWidthMm = 279.4;

  pageMarginMm() {
    return this._margin;
  }

  pageWidthMm() {
    return this._pageWidthMm - this._margin * 2;
  }

  pageHeightMm() {
    return this._pageHeightMm - this._margin * 2;
  }

  paneWidthMm() {
    return this.pageWidthMm() / this.cols;
  }

  paneHeightMm() {
    return this.pageHeightMm() / this.rows;
  }

  paneAspectRatio() {
    return this.paneWidthMm() / this.paneHeightMm();
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
        return { index: 4 };
    }
  }
}

export const Context = createContext<{
  registerPane: (index: number, pane: HTMLDivElement) => void;
}>({
  registerPane: _.noop,
});
