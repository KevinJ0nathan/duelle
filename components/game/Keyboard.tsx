"use client";
import { Delete } from "lucide-react";

interface KeyboardProps {
  onKeyPress: (key: string) => void;
  usedKeys?: Record<string, string>;
}

export default function Keyboard({ onKeyPress, usedKeys }: KeyboardProps) {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
  ];

  return (
    <div className="flex flex-col w-full max-w-[500px] gap-1.5 mx-auto p-2 select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1 justify-center w-full">
          {row.map((key) => {
            const isSpecial = key.length > 1;
            let keyColor = "";
            if (usedKeys?.[key]) {
              keyColor = usedKeys[key];
            }
            return (
              <button
                key={key}
                onClick={() => onKeyPress?.(key)}
                className={`
                  flex items-center justify-center rounded font-bold 
                  transition-all active:scale-95 touch-manipulation
                  bg-[#d3d6db] hover:bg-gray-300 active:bg-gray-400
                  text-[#1a1a1b]
                                    h-12 sm:h-14
                  ${
                    isSpecial
                      ? "flex-[1.5] text-xs sm:text-sm uppercase" // Special keys take 1.5x width
                      : "flex-1 text-lg sm:text-xl" // Letters take 1x width
                  }

                  ${
                    keyColor === "green"
                      ? "bg-green-600 border-green-600 text-white"
                      : ""
                  }
                   ${
                     keyColor === "yellow"
                       ? "bg-yellow-600 border-yellow-600 text-white"
                       : ""
                   }
                   ${
                     keyColor === "slate"
                       ? "bg-slate-600 border-slate-600 text-white"
                       : ""
                   }

                `}
              >
                {key === "BACKSPACE" ? (
                  <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
