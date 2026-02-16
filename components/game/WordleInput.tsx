import { useRef } from "react";

type WordleGridProps = {
  currentGuess: string; // The word the user is currently typing
  guesses: string[]; // List of words they already submitted
  history: string[][]; // Matrix of colors [['G','X','Y','X','X'], ...]
  turn: number; // Which row index is currently active or is the user typing on (0-5)
  isShaking?: boolean; // check if its supposed to be shaking or not
};

function Row({
  guess,
  colors,
  isCurrent,
}: {
  guess: string;
  colors: string[];
  isCurrent: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[...Array(5)].map((_, i) => {
        const letter = guess[i];
        // Default style for empty and inactive rows
        let style = "border-gray-300 bg-transparent";

        if (colors.length > 0) {
          // Row is finished so show the results
          if (colors[i] === "G" || colors[i] == "GREEN")
            style = "bg-green-600 border-green-600 text-white";
          else if (colors[i] === "Y" || colors[i] == "YELLOW")
            style = "bg-yellow-600 border-yellow-600 text-white";
          else style = "bg-slate-600 border-slate-600 text-white"; // wrong answer
        } else if (letter && isCurrent) {
          // Active typing
          style = "border-gray-600 text-black animate-pulse-short";
        } else if (letter && !isCurrent) {
          // This handles edge cases where a word is saved but not colored yet
          style = "border-gray-400 text-black";
        }

        return (
          <div
            key={i}
            className={`aspect-square md:16 md:h-16 border-2 flex items-center justify-center text-2xl md:text-3xl font-bold uppercase transition-all duration-300 ${style}`}
          >
            {letter}
          </div>
        );
      })}
    </div>
  );
}

export default function WordleInput({
  currentGuess,
  guesses,
  history,
  turn,
  isShaking = false,
}: WordleGridProps) {
  // track prev turn number when it change
  const prevTurn = useRef(turn);
  const safeToShow = useRef(true);

  // did the turn increase
  if (turn > prevTurn.current) {
    safeToShow.current = false;
    prevTurn.current = turn;
  }

  // did the input finally clear
  if (currentGuess === "") {
    safeToShow.current = true;
  }
  return (
    <div className="grid grid-rows-6 gap-2 mb-4">
      {[...Array(6)].map((_, i) => {
        const isCurrentRow = i === turn;
        let content = "";
        if (i < turn) {
          // past row shows history
          content = guesses[i] || "";
        } else if (isCurrentRow) {
          content = safeToShow.current ? currentGuess : "";
        }
        return (
          <div
            key={i}
            className={isCurrentRow && isShaking ? "animate-shake" : ""}
          >
            <Row
              guess={content}
              colors={history[i] || []}
              isCurrent={isCurrentRow}
            />
          </div>
        );
      })}
    </div>
  );
}
