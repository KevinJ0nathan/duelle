import { useState, useEffect, useCallback } from "react";
import { submitGuess } from "@/app/actions";

export function useWordle(gameId: string, userId: string) {
  const [currentGuess, setCurrentGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [history, setHistory] = useState<string[][]>([]); // history of colors
  const [isProcessing, setIsProcessing] = useState(false);

  // Keyboard state for coloring keys that were used in guessing
  const [usedKeys, setUsedKeys] = useState<Record<string, string>>({});

  // Function that handles all input from both keyboard and screen
  const handleKey = useCallback(
    async (key: string) => {
      if (isProcessing) return;

      if (key === "ENTER") {
        if (currentGuess.length !== 5) return; // guesses must be 5 letters

        setIsProcessing(true);
        // Call the server action
        const result = await submitGuess(gameId, currentGuess, userId);
        // Handle error
        if (result.error) {
          alert(result.error);
          setIsProcessing(false);
          return;
        }
        // Handle success
        if (result.success && result.colors) {
          setTimeout(() => {
            setGuesses((prev) => [...prev, currentGuess]);
            setHistory((prev) => [...prev, result.colors]);

            setUsedKeys((prev) => {
              const newKeys = { ...prev };

              currentGuess.split("").forEach((rawLetter, i) => {
                const letter = rawLetter.toUpperCase();
                const color = result.colors[i];
                const currentColor = newKeys[letter];

                if (color === "G") {
                  newKeys[letter] = "green";
                } else if (color === "Y" && currentColor !== "green") {
                  newKeys[letter] = "yellow";
                } else if (
                  color === "X" &&
                  currentColor !== "green" &&
                  currentColor !== "yellow"
                ) {
                  newKeys[letter] = "slate";
                }
              });

              return newKeys;
            });
          }, 0);
          // Reset for next turn
          setCurrentGuess("");
        }

        setIsProcessing(false);
        return;
      }
      // Delete
      if (key === "DELETE" || key === "BACKSPACE") {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }
      // Add letter to current guess
      if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [isProcessing, currentGuess, gameId, userId, submitGuess],
  );
  // Listen for actual keyboard inputs
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      // Map enter and backspace
      if (key === "ENTER" || key === "BACKSPACE") handleKey(key);
      // Only allow A-Z
      else if (/^[A-Z]$/.test(key)) handleKey(key);
    };
    window.addEventListener("keyup", listener);
    return () => window.removeEventListener("keyup", listener);
  }, [handleKey]);

  // function to resume game
  const resumeGame = useCallback((savedGuesses: string[]) => {
    if (!savedGuesses || savedGuesses.length === 0) return;

    let newGuesses: string[] = [];
    let newHistory: string[][] = [];
    const newKeys: Record<string, string> = {};

    savedGuesses.forEach((val) => {
      // Parse "apple:GYXXX" from the current player
      const [wordRaw, colors] = val.split(":");
      if (!wordRaw || !colors) return;

      const word = wordRaw.toUpperCase();
      const colorArr = colors.split("");

      newGuesses.push(word);
      newHistory.push(colorArr);

      // Recalculate kb colorsr
      word.split("").forEach((letter, i) => {
        const color = colorArr[i];
        const currentColor = newKeys[letter];

        if (color === "G") {
          newKeys[letter] = "green";
          return;
        }
        if (color === "Y" && currentColor !== "green") {
          newKeys[letter] = "yellow";
          return;
        }
        if (
          color === "X" &&
          currentColor !== "green" &&
          currentColor !== "yellow"
        ) {
          newKeys[letter] = "slate";
          return;
        }
      });
    });
    setGuesses(newGuesses);
    setHistory(newHistory);
    setUsedKeys(newKeys);
  }, []);

  return {
    currentGuess,
    guesses,
    history,
    usedKeys,
    handleKey,
    isProcessing,
    resumeGame,
  };
}
