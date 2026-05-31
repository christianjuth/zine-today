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

const LETTER_WIDTH_MM = 279.4;
const LETTER_HEIGHT_MM = 215.9;

const COLS = 4;
const ROWS = 2;

const PANE_WIDTH = LETTER_WIDTH_MM / COLS;
const PANE_HEIGHT = LETTER_HEIGHT_MM / ROWS;

async function print(ctx: { images: HTMLDivElement[] }) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [LETTER_WIDTH_MM, LETTER_HEIGHT_MM],
  });

  let i = 0;
  for (const div of ctx.images) {
    const col = i % 4;
    const row = i >= 4 ? 1 : 0;
    const img = await toPng(div);
    doc.addImage(
      img,
      "png",
      col * PANE_WIDTH,
      row * PANE_HEIGHT,
      PANE_WIDTH,
      PANE_HEIGHT,
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

function Pane(props: { index: number }) {
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
        aspectRatio: PANE_WIDTH / PANE_HEIGHT,
        backgroundColor: props.index % 2 === 0 ? "black" : "white",
        color: props.index % 2 === 0 ? "white" : "black",
      }}
    >
      Pane {props.index}
    </div>
  );
}

function App() {
  const [panes, setPanes] = useState<HTMLDivElement[]>([]);
  console.log(panes);
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
              <Pane key={index} index={index} />
            ))}
        </div>
      </Context.Provider>
      <button
        onClick={() =>
          print({
            images: _.compact(panes),
          })
        }
      >
        Print
      </button>
    </>
  );
}

export default App;
