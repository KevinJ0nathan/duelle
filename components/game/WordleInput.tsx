type WordleGridProps = {
  currentGuess: string; // The word the user is currently typing
  guesses: string[]; // List of words they already submitted
  history: string[][]; // Matrix of colors [['G','X','Y','X','X'], ...]
  turn: number; // Which row index is currently active or is the user typing on (0-5)
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
        } else if (letter) {
          // Active typing wrong
          style = "border-gray-600 text-black animate-pulse-short";
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
}: WordleGridProps) {
  return (
    <div className="grid grid-rows-6 gap-2 mb-4">
      {[...Array(6)].map((_, i) => (
        <Row
          key={i}
          guess={i === turn ? currentGuess : guesses[i] || ""}
          colors={history[i] || []}
          isCurrent={i === turn}
        />
      ))}
    </div>
  );
}
