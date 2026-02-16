"use client";

import Keyboard from "@/components/game/Keyboard";
import WordleInput from "@/components/game/WordleInput";
import GameOverModal from "@/components/game/GameOverModal";

import { useWordle } from "@/hooks/useWordle";
import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClientComponentClient } from "@/lib/supabase";
import { claimInactivityWin, requestRematch } from "@/app/actions";

export default function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // game id
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClientComponentClient();
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
  // for rematch
  const [rematchRequested, setRematchRequested] = useState(false);
  const [opponentRematchRequested, setOpponentRematchRequested] =
    useState(false);

  const [fatalError, setFatalError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRematchClick = async () => {
    setRematchRequested(true);
    const result = await requestRematch(id, userId!);

    if (result && result.newGameId) {
      router.push(`game/${result.newGameId}`);
    }
  };

  const showInvalidError = (msg: string = "Not in word list") => {
    setIsShaking(true);
    setToastMessage(msg);

    setTimeout(() => setIsShaking(false), 600); // remove shaking after 600 ms
    setTimeout(() => setToastMessage(null), 2000); // remove toast message after 2s
  };

  const wordle = useWordle(id, userId || "", showInvalidError);

  // Initialize & Authentication
  useEffect(() => {
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
        .single();

      if (error || !game) {
        if (hasRedirected.current) return;
        hasRedirected.current = true;

        setFatalError("Game not found. Redirecting...");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

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
        await Promise.all([
          supabase
            .from("active_games")
            .update({
              player2_uid: currentUserId,
              status: "playing",
              last_move_at: new Date().toISOString(),
            })
            .eq("id", id),
          await supabase
            .from("games")
            .update({
              player2_uid: currentUserId,
              status: "playing",
              last_move_at: new Date().toISOString(),
            })
            .eq("id", id),
        ]);
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
        setOpponentGuesses(rawScores.map(() => "?????"));
        setOpponentHistory(rawScores.map((s: string) => s.split("")));
      }

      // Restore the current user game data (if the user reloads the page)
      // Use rpc to call the current player guesses
      const { data: restoredGuesses, error: rpcError } = await supabase.rpc(
        "get_my_restored_state",
        { game_uuid: id },
      );

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
  }, [id, userId, router, supabase, wordle]);

  // Useeffect for realtime updates
  useEffect(() => {
    if (!userId || loading) return;
    const channel = supabase
      .channel("game_updates")
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

          // update status e.g from waiting to playing
          setGameStatus(newGame.status);

          if (newGame.last_move_at) setLastMoveAt(newGame.last_move_at);
          if (newGame.last_move_by_id) setLastMoveBy(newGame.last_move_by_id);

          setHasClaimed(false);

          const isPlayer1 = userId === newGame.player1_uid;
          const rawScores = isPlayer1 ? newGame.p2_scores : newGame.p1_scores;
          if (rawScores) {
            setOpponentGuesses(rawScores.map(() => "?????"));
            setOpponentHistory(rawScores.map((s: string) => s.split("")));
          }
          if (newGame.status === "finished") {
            setWinner(newGame.winner_uid);
          }

          // Check for rematch
          const opponentRematch = isPlayer1
            ? newGame.player2_rematch
            : newGame.player1_rematch;
          setOpponentRematchRequested(opponentRematch);
          // Auto redirect to new game if rematch exist
          if (newGame.rematch_id) {
            router.push(`/game/${newGame.rematch_id}`);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId, loading, supabase, router]);

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

  // Rematch checker
  useEffect(() => {
    // Only run if game is finished
    if (gameStatus !== "finished") return;

    const interval = setInterval(async () => {
      // Check if there is rematch id
      const { data } = await supabase
        .from("active_games")
        .select("rematch_id")
        .eq("id", id)
        .single();
      // if it exist then redirect user to rematch
      if (data?.rematch_id) {
        router.push(`/game/${data.rematch_id}`);
      }
    }, 3000); // check every 3 seconds
    return () => clearInterval(interval);
  }, [id, gameStatus, router, supabase]);

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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-toast pointer-events-none">
          <div className="bg-black/80 text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg whitespace-nowrap">
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
                  className="text-5xl font-mono font-black tracking-widest text-green-700 bg-green-50 px-8 py-4 rounded-xl border-2 border-green-200 select-all cursor-pointer"
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
          />
        </div>
        <div className="flex flex-1 flex-col items-center opacity-80">
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
      <div className="w-full pb-8 px-2 mt-8 max-w-2xl">
        <Keyboard onKeyPress={wordle.handleKey} usedKeys={wordle.usedKeys} />
      </div>

      {gameStatus === "finished" && (
        <GameOverModal
          winner={winner}
          currentUserId={userId}
          isRematchRequested={rematchRequested}
          isOpponentRematchRequested={opponentRematchRequested}
          onRematch={handleRematchClick}
          onExit={() => router.push("/")}
        />
      )}
    </div>
  );
}
