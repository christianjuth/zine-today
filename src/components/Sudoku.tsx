import { useMemo } from "react";
import { generateSudoku } from "../lib/sudoku";
import { Dayjs } from "dayjs";

export function Sudoku(props: { salt: number; date: Dayjs }) {
  const dateStr = props.date.format("YYYY-MM-DD");
  const puzzle = useMemo(
    () => generateSudoku(dateStr + props.salt, { difficulty: "medium" }),
    [props.salt, dateStr],
  );

  return (
    <div className="inline-block border-b-2 border-r-2 border-gray-800 bg-white">
      {puzzle.puzzle.map((row, y) => (
        <div key={y} className="flex">
          {row.map((cell, x) => (
            <div
              key={x}
              className={[
                "flex h-[21px] w-[21px] items-center justify-center text-xl font-medium text-gray-800 select-none",
                "border-t border-l border-black/50",
                y % 3 === 0 && "border-t-2 border-t-gray-800",
                x % 3 === 0 && "border-l-2 border-l-gray-800",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cell !== 0 ? cell : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
