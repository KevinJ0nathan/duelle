interface GameOverModalProps {
  winner: string | null;
  currentUserId: string | null;
  isRematchRequested: boolean;
  isOpponentRematchRequested: boolean;
  onRematch: () => void;
  rematchStatus: "idle" | "waiting" | "timeout";
  onExit: () => void;
  secretWord: string | null;
}

export default function GameOverModal({
  winner,
  currentUserId,
  isRematchRequested,
  isOpponentRematchRequested,
  onRematch,
  rematchStatus,
  onExit,
  secretWord,
}: GameOverModalProps) {
  // determine who won
  const isVictory = winner === currentUserId;
  const isDraw = winner === null;

  const isWaiting = rematchStatus === "waiting";
  const isTimeout = rematchStatus === "timeout";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full border border-white/20 ring-4 ring-[#2D4030]/10 transform transition-all scale-100">
        {/* Header and icon */}
        <div className="mb-6">
          {isVictory ? (
            <>
              <div className="text-6xl mb-2 animate-bounce">🏆</div>
              <h2 className="text-4xl font-black text-green-700 tracking-tight">
                VICTORY!
              </h2>
              <p className="text-gray-500 font-medium mt-2">
                You won!!!
                <br />
                The word was <b className="text-green-700">{secretWord}</b>.
              </p>
            </>
          ) : isDraw ? (
            <>
              <div className="text-6xl mb-2">🤝</div>
              <h2 className="text-4xl font-black text-gray-500 tracking-tight">
                DRAW
              </h2>
              <p className="text-gray-500 font-medium mt-2">
                No one found the word. <br />
                The word was <b className="text-green-700">{secretWord}</b>.
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-2">💀</div>
              <h2 className="text-4xl font-black text-red-600 tracking-tight">
                DEFEAT
              </h2>
              <p className="text-gray-500 font-medium mt-2">
                Better luck next time. <br />
                The word was <b className="text-green-700">{secretWord}</b>.
              </p>
            </>
          )}
        </div>

        {/* Status for rematch */}
        {isOpponentRematchRequested && !isRematchRequested && (
          <div className="bg-yellow-100 text-yellow-800 text-sm font-bold py-2 px-4 rounded-lg mb-6 animate-pulse border border-green-200">
            Opponent wants a rematch!
          </div>
        )}

        {/* {isRematchRequested && !isOpponentRematchRequested && (
          <div className="bg-yellow-50 text-yellow-800 text-sm font-bold py-2 px-4 rounded-lg mb-6 border border-yellow-200">
            Waiting for opponent...
          </div>
        )} */}

        {/* Action buttons */}
        <div className="space-y-3">
          {/* For rematch */}
          <button
            onClick={onRematch}
            disabled={isWaiting || isTimeout || isRematchRequested}
            className={`w-full py-4 text-lg font-bold rounded-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-sm
              ${
                isRematchRequested
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : isOpponentRematchRequested
                    ? "bg-yellow-500 hover:bg-yellow-600 text-white animate-pulse"
                    : "bg-green-600 hover:bg-green-700 text-white"
              }`}
          >
            {isTimeout
              ? "Opponent Disconnected"
              : isRematchRequested
                ? "Waiting for Opponent..."
                : isOpponentRematchRequested
                  ? "Accept Rematch Request"
                  : "Rematch"}
          </button>

          {/* For exiting the game */}
          <button
            onClick={onExit}
            className="w-full py-4 text-lg font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Exit to lobby
          </button>
        </div>
      </div>
    </div>
  );
}
