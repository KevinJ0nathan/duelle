"use client";

export default function Home() {
  type TileStatus = "green" | "gold" | "gray" | "empty";

  interface Tile {
    l: string;
    s: TileStatus;
  }

  const row1: Tile[] = [
    { l: "S", s: "gray" },
    { l: "T", s: "gray" },
    { l: "A", s: "gold" },
    { l: "R", s: "gold" },
    { l: "E", s: "gray" },
  ];

  const row2: Tile[] = [
    { l: "M", s: "green" },
    { l: "A", s: "gold" },
    { l: "R", s: "green" },
    { l: "C", s: "gray" },
    { l: "H", s: "gray" },
  ];

  const row3: Tile[] = [
    { l: "M", s: "green" },
    { l: "A", s: "gold" },
    { l: "T", s: "green" },
    { l: "C", s: "gray" },
    { l: "H", s: "gray" },
  ];

  const getColor = (status: TileStatus) => {
    if (status === "green") return "bg-[#859f70]";
    if (status === "gold") return "bg-[#b59f5b]";
    return "bg-[#6a6c6e]";
  };

  return (
    <div className="flex flex-col bg-[var(--bg-cream)] min-h-screen">
      {/* Header */}
      <header className="md:absolute top-0 left-0 z-10 w-full px-8 py-6 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2D4030] rounded-lg flex items-center justify-center text-[#F9F8F6]">
            <span className="font-bold text-lg">D</span>
          </div>
          <span className="font-bold text-xl text-[#2D4030] font-serif tracking-tight">
            Duelle
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {/* Clickable Profile Button */}
            <button
              onClick={() => console.log("Profile clicked!")}
              className="w-10 h-10 bg-[#C7DBC6] rounded-full flex items-center justify-center text-[#2D4030] transition-transform hover:scale-105 active:scale-95 cursor-pointer border-none outline-none"
              aria-label="User Profile"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6"
              >
                <path
                  fillRule="evenodd"
                  d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content container */}
      <main className="flex-1 flex flex-col justify-center items-center p-8 w-full">
        {/* Content Container */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl gap-16 lg:gap-24">
          {/* Left Side: Hero Section */}
          <div className="flex-1 w-full max-w-md">
            <h1 className="text-6xl font-serif font-bold leading-tight">
              Wordle, <br />
              but faster.
            </h1>
            <p className="my-6 text-lg text-gray-700">
              Challenge friends in real-time 1v1 duels.
            </p>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button className="w-full text-xl p-4 bg-[var(--matcha-dark)] text-white font-semibold rounded-md hover:opacity-90 transition-opacity cursor-pointer">
                Find Opponent
              </button>

              <div className="flex items-center gap-3 text-xs text-[#8FAE90] font-bold uppercase tracking-widest py-2">
                <span className="flex-grow border-t border-gray-300"></span>
                OR
                <span className="flex-grow border-t border-gray-300"></span>
              </div>

              <div className="flex w-full gap-2 items-stretch">
                <input
                  type="text"
                  placeholder="ENTER CODE"
                  className="min-w-0 flex-1 px-2 py-4 text-center font-semibold text-gray-700 border border-gray-300 rounded-xl shadow-sm focus:outline-none"
                />
                <button className="w-1/4 bg-[#3d5a3e] text-white font-bold rounded-xl shadow-sm hover:bg-green-700 transition cursor-pointer">
                  JOIN
                </button>
              </div>

              <button className="text-center font-medium w-full py-2 text-[var(--matcha-accent)] hover:underline cursor-pointer">
                Create a Private Room
              </button>
            </div>
          </div>

          {/* Right Side: Hero Icon */}
          <div className="flex-1 flex justify-center w-full">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md aspect-[3/4] flex flex-col">
              {/* Inner Header */}
              <div className="flex justify-between text-xs font-black text-gray-400 mb-6 tracking-tighter">
                <span>YOU</span>
                <span className="text-gray-200">VS</span>
                <span>GUEST</span>
              </div>

              {/* The WORDLE Guesses */}
              <div className="grid grid-cols-5 gap-3">
                {row1.map((item, i) => (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center text-white font-bold rounded-sm text-2xl ${getColor(item.s)}`}
                  >
                    {item.l}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-3 mt-3">
                {row2.map((item, i) => (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center text-white font-bold rounded-sm text-2xl ${getColor(item.s)}`}
                  >
                    {item.l}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-3 mt-3">
                {row3.map((item, i) => (
                  <div
                    key={i}
                    className="aspect-square flex items-center justify-center text-black font-bold rounded-sm text-2xl border-2 border-gray-300"
                  >
                    {item.l}
                  </div>
                ))}
              </div>

              {/* Empty slots */}
              {[...Array(3)].map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid grid-cols-5 gap-3 mt-3 opacity-10"
                >
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-400 rounded-sm"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
