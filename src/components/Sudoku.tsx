import { useRef } from "react";
import { generateSudoku } from "../lib/sudoku";
import dayjs from "dayjs";

const TODAY = dayjs().format("YYYY-MM-DD");

export function Sudoku(props: { offset: number }) {
  const puzzle = useRef(
    generateSudoku(TODAY + props.offset, { difficulty: "medium" }),
  ).current;

  return (
    <div className="inline-block border-b-2 border-r-2 border-gray-800 bg-white">
      {puzzle.puzzle.map((row, y) => (
        <div key={y} className="flex">
          {row.map((cell, x) => (
            <div
              key={x}
              className={[
                "flex h-5.5 w-5.5 items-center justify-center text-xl font-medium text-gray-800 select-none",
                "border-t border-l border-gray-300",
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
