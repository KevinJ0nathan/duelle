"use client";

import Keyboard from "@/components/game/Keyboard";
import WordleInput from "@/components/game/WordleInput";
import GameOverModal from "@/components/game/GameOverModal";

import { useWordle } from "@/hooks/useWordle";
import { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { createClientComponentClient } from "@/lib/supabase";
import {
  claimInactivityWin,
  requestRematch,
  joinGameById,
  cancelRematch,
  leaveQueue,
  getSecretWord,
} from "@/app/actions";

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <GameContent key={id} id={id} />;
}

function GameContent({ id }: { id: string }) {
  // game id
  const router = useRouter();
  const supabase = createClientComponentClient();
  const instanceRef = useRef(0);
  // Prevent double code runs when error is found
  const hasRedirected = useRef(false);
  // user state
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // opponent states (visuals)
  const [opponentGuesses, setOpponentGuesses] = useState<string[]>([]);
  const [opponentHistory, setOpponentHistory] = useState<string[][]>([]);
  // game state
  const [gameStatus, setGameStatus] = useState<string>("playing");
  const [winner, setWinner] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [lastMoveAt, setLastMoveAt] = useState<string | null>(null);
  const [lastMoveBy, setLastMoveBy] = useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [secretWord, setSecretWord] = useState<string | null>(null);
  // for rematch
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] =
    useState(false);
  const [rematchStatus, setRematchStatus] = useState<
    "idle" | "waiting" | "timeout"
  >("idle");

  const [fatalError, setFatalError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRematchClick = async () => {
    setRematchStatus("waiting");
    setRematchRequested(true);

    const result = await requestRematch(id, userId!);

    if (result && result.newGameId) {
      router.replace(`/game/${result.newGameId}`);
    }
    // Timeout safety so user wont be stuck in rematch screen
    setTimeout(() => {
      setRematchStatus((currentStatus) => {
        if (currentStatus === "waiting") {
          cancelRematch(id, userId!);

          showInvalidError("Opponent Disconnected");
          return "timeout"; // stop loading spinner
        }
        return currentStatus;
      });
    }, 60000); // wait for 1 minute
  };

  const handleExitQueue = async () => {
    // delete game from db
    await leaveQueue(id, userId!);
    // redirect users to landing page
    router.push("/");
  };

  const showInvalidError = useCallback((msg: string = "Not in word list") => {
    setIsShaking(true);
    setToastMessage(msg);

    setTimeout(() => setIsShaking(false), 600); // remove shaking after 600 ms
    setTimeout(() => setToastMessage(null), 2000); // remove toast message after 2s
  }, []);

  const wordle = useWordle(id, userId || "", showInvalidError);

  useEffect(() => {
    instanceRef.current += 1;
  }, [id]);

  useEffect(() => {
    hasRedirected.current = false;
    wordle.resetGame();
    setWinner(null);
    setSecretWord(null);
    setGameStatus("playing");
    setOpponentGuesses([]);
    setOpponentHistory([]);
    setRematchRequested(false);
    setOpponentRematchRequested(false);
    setHasClaimed(false);
    setLoading(true);
  }, [id]);

  // Initialize & Authentication
  useEffect(() => {
    const instance = ++instanceRef.current;
    const initializeGame = async () => {
      // login check
      let currentUserId = userId;
      if (!currentUserId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          currentUserId = session.user.id;
        } else {
          // if no session then sign in anonymous
          const { data } = await supabase.auth.signInAnonymously();
          currentUserId = data.user?.id ?? null;
        }
        setUserId(currentUserId);
      }
      if (!currentUserId) return;

      // Fetch game data
      const { data: game, error } = await supabase
        .from("active_games")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !game) {
        if (hasRedirected.current) return;
        hasRedirected.current = true;

        setFatalError("Game not found. Redirecting...");
        setTimeout(() => router.push("/"), 2000);
        return;
      }
      if (instance !== instanceRef.current) return;
      // capture join code if it exists
      if (game.join_code) setJoinCode(game.join_code);
      setGameStatus(game.status); // waiting or playing
      if (game.winner_uid) setWinner(game.winner_uid);
      if (game.last_move_at) setLastMoveAt(game.last_move_at);
      if (game.last_move_by_uid) setLastMoveBy(game.last_move_by_uid);
      // prevent more than 2 client to access the game page
      const isPlayer1 = game.player1_uid == currentUserId;
      const isPlayer2 = game.player2_uid == currentUserId;
      const isSeatOpen = !game.player2_uid;

      if (isPlayer1 || isPlayer2) {
        // already in
      } else if (isSeatOpen) {
        // if the game is not filled with 2 players yet, get current id then fill it in the db
        const joinResult = await joinGameById(id, currentUserId);

        if (joinResult.error) {
          if (hasRedirected.current) return;
          hasRedirected.current = true;
          alert(joinResult.error); // "Game Full" or Error
          router.push("/");
          return;
        }
      } else {
        if (hasRedirected.current) return;
        hasRedirected.current = true;

        alert("Game Full");
        router.push("/");
        return;
      }

      // Load board states
      const amIPlayer1 = game.player1_uid === currentUserId;
      const rawScores = amIPlayer1 ? game.p2_scores : game.p1_scores;
      if (rawScores && Array.isArray(rawScores)) {
        setOpponentGuesses(rawScores.map(() => ""));
        setOpponentHistory(rawScores.map((s: string) => s.split("")));
      }

      // Restore the current user game data (if the user reloads the page)
      // Use rpc to call the current player guesses
      const { data: restoredGuesses, error: rpcError } = await supabase.rpc(
        "get_my_restored_state",
        { game_uuid: id },
      );
      if (instance !== instanceRef.current) return;
      // if we have saved moves in db but our local board is empty then we should restore the db
      if (
        restoredGuesses &&
        Array.isArray(restoredGuesses) &&
        wordle.guesses.length === 0
      ) {
        wordle.resumeGame(restoredGuesses);
      }

      setLoading(false);
    };
    initializeGame();
  }, [id, userId]);

  // Useeffect for realtime updates
  useEffect(() => {
    if (!userId || loading) return;
    const channel = supabase
      .channel(`game_updates_${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "active_games",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newGame = payload.new as any;

          if (newGame.id !== id) return;

          // // Check if game status is changing from waiting to playing
          // if (gameStatus === "waiting" && newGame.status === "playing") {
          //   // Play sound
          //   try {
          //     const audio = new Audio("/match.mp3");
          //     audio.volume = 0.5;
          //     audio.play().catch((e) => console.log("Audio Blocked:", e));
          //   } catch (err) {
          //     console.error("Sound error", err);
          //   }
          // }

          // update status e.g from waiting to playing
          setGameStatus(newGame.status);

          if (newGame.last_move_at) setLastMoveAt(newGame.last_move_at);
          if (newGame.last_move_by_id) setLastMoveBy(newGame.last_move_by_id);

          setHasClaimed(false);

          const isPlayer1 = userId === newGame.player1_uid;
          const rawScores = isPlayer1 ? newGame.p2_scores : newGame.p1_scores;
          if (rawScores) {
            setOpponentGuesses(rawScores.map(() => ""));
            setOpponentHistory(rawScores.map((s: string) => s.split("")));
          }
          if (newGame.status === "finished") {
            setWinner(newGame.winner_uid);

            const instance = instanceRef.current;

            getSecretWord(id).then((res) => {
              if (instance !== instanceRef.current) return;
              if (res.secret) setSecretWord(res.secret.toUpperCase());
            });
          }

          // Check for rematch
          const opponentRematch = isPlayer1
            ? newGame.p2_rematch
            : newGame.p1_rematch;
          setOpponentRematchRequested(opponentRematch);
          // Auto redirect to new game if rematch exist
          if (newGame.rematch_id) {
            router.replace(`/game/${newGame.rematch_id}`);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId, loading]);

  // Auto win checker if the opponent is inactive
  useEffect(() => {
    if (gameStatus !== "playing" || !lastMoveAt || !lastMoveBy || hasClaimed)
      return;

    const interval = setInterval(async () => {
      const now = new Date().getTime();
      const last = new Date(lastMoveAt).getTime();
      const secondsPassed = (now - last) / 1000;

      const TIMEOUT_LIMIT = 120; // 2 minutes

      if (secondsPassed >= TIMEOUT_LIMIT && lastMoveBy === userId) {
        setHasClaimed(true);
        clearInterval(interval);

        const result = await claimInactivityWin(id, userId);
        if (result.error) {
          console.error("Auto-claim failed:", result.error);
          setHasClaimed(false); // Retry if it failed
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastMoveAt, lastMoveBy, gameStatus, userId, hasClaimed, id]);

  // // Rematch checker
  // useEffect(() => {
  //   // Only run if game is finished
  //   if (gameStatus !== "finished") return;

  //   const interval = setInterval(async () => {
  //     // Check if there is rematch id
  //     const { data } = await supabase
  //       .from("active_games")
  //       .select("rematch_id")
  //       .eq("id", id)
  //       .single();
  //     // if it exist then redirect user to rematch
  //     if (data?.rematch_id) {
  //       router.push(`/game/${data.rematch_id}`);
  //     }
  //   }, 3000); // check every 3 seconds
  //   return () => clearInterval(interval);
  // }, [id, gameStatus, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`rematch-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "active_games",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newRematchId = payload.new.rematch_id;

          if (newRematchId) {
            router.replace(`/game/${newRematchId}`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (fatalError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-red-50 text-red-800">
        <h1 className="text-3xl font-bold">Error</h1>
        <p>{fatalError}</p>
      </div>
    );
  }

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        Loading Arena...
      </div>
    );

  return (
    <div className="flex flex-col justify-start items-center h-screen bg-[#F9F8F6]">
      {toastMessage && (
        <div className="fixed top-20 left-0 w-full flex justify-center z-50 pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg whitespace-nowrap animate-toast">
            {toastMessage}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="w-full px-8 py-6 flex justify-between items-center bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2D4030] rounded-lg flex items-center justify-center text-[#F9F8F6]">
            <span className="font-bold text-lg">D</span>
          </div>
          <span className="font-bold text-xl text-[#2D4030] font-serif tracking-tight">
            Duelle
          </span>
        </div>
      </header>
      {/* Container for Player vs Enemy */}
      <div className="relative w-full max-w-5xl flex gap-12 px-4 mt-16">
        {/* Waiting overlay */}
        {gameStatus === "waiting" && (
          <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-[#2D4030] mb-2">
              Waiting for Player 2...
            </h2>

            {joinCode ? (
              <div className="text-center">
                <p className="">Share this code with your friend:</p>
                <div
                  className="md:text-5xl text-2xl font-mono font-black tracking-widest text-green-700 bg-green-50 px-8 py-4 rounded-xl border-2 border-green-200 select-all cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(joinCode)}
                >
                  {joinCode}
                </div>
                <p className="text-xs text-gray-400 mt-2">Click code to copy</p>
              </div>
            ) : (
              <p className="animate-bounce text-gray-500">
                Searching for a match...
              </p>
            )}

            <button
              onClick={handleExitQueue}
              className="text-red-500 font-bold text-sm hover:underline cursor-pointer"
            >
              Cancel Search
            </button>
          </div>
        )}

        {/* Player Side */}
        <div className="flex flex-1 flex-col items-center">
          <span className="text-xs font-bold text-green-600 tracking-widest mb-4">
            YOU
          </span>

          <WordleInput
            currentGuess={wordle.currentGuess}
            guesses={wordle.guesses}
            history={wordle.history}
            turn={wordle.guesses.length}
            isShaking={isShaking}
          />
        </div>
        <div className="flex flex-1 flex-col items-center opacity-80 fixed top-1 right-10 md:static md:top-auto md:right-auto">
          <span className="text-xs font-bold text-red-500 tracking-widest mb-4">
            OPPONENT
          </span>
          <WordleInput
            currentGuess=""
            guesses={opponentGuesses}
            history={opponentHistory}
            turn={opponentGuesses.length}
          />
        </div>
      </div>
      {/* / Keyboard */}
      <div className="w-full pb-8 px-2 md:mt-8 max-w-2xl fixed bottom-1 md:static">
        <Keyboard onKeyPress={wordle.handleKey} usedKeys={wordle.usedKeys} />
      </div>

      {gameStatus === "finished" && (
        <GameOverModal
          winner={winner}
          currentUserId={userId}
          isRematchRequested={rematchRequested}
          isOpponentRematchRequested={opponentRematchRequested}
          onRematch={handleRematchClick}
          rematchStatus={rematchStatus}
          onExit={() => router.push("/")}
          secretWord={secretWord}
        />
      )}
    </div>
  );
}
