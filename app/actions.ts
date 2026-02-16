"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const generateCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// function to check if user is in an existing game
async function findActiveGame(userId: string) {
  // check if user is in a game that is unfinished
  const { data: activeGame } = await supabase
    .from("games")
    .select("id")
    .or(`player1_uid.eq.${userId},player2_uid.eq.${userId}`)
    .neq("status", "finished") // only check open games
    .maybeSingle();

  return activeGame;
}

export async function joinQueue(userId: string) {
  // Check if they are already in a game
  const existingGame = await findActiveGame(userId);
  if (existingGame) {
    return { gameId: existingGame.id }; // send them back to their unfinished game
  }
  // Try to find a waiting public game
  const { data: openGame } = await supabase
    .from("games")
    .select("id")
    .eq("status", "waiting")
    .eq("is_private", false) // dont join private lobbies
    .neq("player1_uid", userId) // dont join urself
    .limit(1)
    .maybeSingle();
  // if a game is in a queue
  if (openGame) {
    // join the first game found
    await supabase
      .from("games")
      .update({
        player2_uid: userId,
        status: "playing",
        last_move_at: new Date().toISOString(),
        last_move_by_uid: userId,
      })
      .eq("id", openGame.id);

    await supabase
      .from("active_games")
      .update({
        player2_uid: userId,
        status: "playing",
        last_move_at: new Date().toISOString(),
        last_move_by_uid: userId,
      })
      .eq("id", openGame.id);

    return { gameId: openGame.id };
  }

  // if there is no game in queue, then create a new public game
  const { count, error: countError } = await supabase
    .from("dictionary")
    .select("*", { count: "exact", head: true }) // dont return data and just count
    .eq("is_target", true);

  if (countError || !count) return { error: "Could not fetch word count" };

  // generate random index to pick random word
  const randomIndex = Math.floor(Math.random() * count);

  // Fetch only the single word at the index
  const { data: secretWordData } = await supabase
    .from("dictionary")
    .select("word")
    .eq("is_target", true)
    .range(randomIndex, randomIndex)
    .single();

  const secret = secretWordData?.word;

  // create the game data in private db
  const { data: newGame, error } = await supabase
    .from("games")
    .insert({
      player1_uid: userId,
      status: "waiting",
      secret_word: secret,
      is_private: false,
      last_move_at: new Date().toISOString(),
      last_move_by_uid: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Create Public Mirror
  await supabase.from("active_games").insert({
    id: newGame.id,
    player1_uid: userId,
    status: "waiting",
    is_private: false,
    p1_scores: [],
    p2_scores: [],
    last_move_at: new Date().toISOString(),
    last_move_by_uid: userId,
  });

  return { gameId: newGame.id };
}
// allow users to join game by link
export async function joinGameById(gameId: string, userId: string) {
  const { data: game } = await supabase
    .from("games")
    .select("status, player1_uid, player2_uid")
    .eq("id", gameId)
    .single();
  // if the current user already in the game then do nothing
  if (game?.player1_uid === userId || game?.player2_uid === userId) {
    return { success: true };
  }
  // if someone is already player 2
  if (game?.player2_uid) {
    return { error: "Game Full" };
  }

  // join the game
  const updates = {
    player2_uid: userId,
    status: "playing",
    last_move_at: new Date().toISOString(),
    last_move_by_uid: userId,
  };

  // update private table
  const { error: privateError } = await supabase
    .from("games")
    .update(updates)
    .eq("id", gameId);

  if (privateError) return { error: "Failed to join secure game" };

  // update public table
  const { error: publicError } = await supabase
    .from("active_games")
    .update(updates)
    .eq("id", gameId);

  if (publicError) return { error: "Failed to join secure game" };

  revalidatePath(`/game/${gameId}`);
  return { success: true };
}

// create a private game
// have a unique 6-character code
// set is private = true

export async function createPrivateGame(userId: string) {
  // prevent users from making 2 private games at once
  const existingGame = await findActiveGame(userId);
  if (existingGame) {
    return { gameId: existingGame.id };
  }

  let joinCode = "";
  let isUnique = false;

  while (!isUnique) {
    joinCode = generateCode();

    const { data } = await supabase
      .from("games")
      .select("id")
      .eq("join_code", joinCode)
      .maybeSingle();
    // if data is null then code is unique
    if (!data) {
      isUnique = true;
    }
  }

  const { count, error: countError } = await supabase
    .from("dictionary")
    .select("*", { count: "exact", head: true }) // dont return data and just count
    .eq("is_target", true);

  if (countError || !count) return { error: "Could not fetch word count" };

  // generate random index to pick random word
  const randomIndex = Math.floor(Math.random() * count);

  // Fetch only the single word at the index
  const { data: secretWordData } = await supabase
    .from("dictionary")
    .select("word")
    .eq("is_target", true)
    .range(randomIndex, randomIndex)
    .single();

  const secret = secretWordData?.word;

  // create a private record of the game data
  const { data: newGame, error } = await supabase
    .from("games")
    .insert({
      player1_uid: userId,
      status: "waiting",
      secret_word: secret,
      is_private: true,
      join_code: joinCode,
      last_move_at: new Date().toISOString(),
      last_move_by_uid: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // create a public mirror
  await supabase.from("active_games").insert({
    id: newGame.id,
    player1_uid: userId,
    status: "waiting",
    is_private: true,
    join_code: joinCode,
    p1_scores: [],
    p2_scores: [],
    last_move_at: new Date().toISOString(),
    last_move_by_uid: userId,
  });

  return { gameId: newGame.id, code: joinCode };
}

// Join private game
// Find a game by its 4 character code
// join if its valid

export async function joinPrivate(code: string, userId: string) {
  // If they are already in a game, send them back
  const existingGame = await findActiveGame(userId);
  if (existingGame) {
    return { gameId: existingGame.id };
  }
  const cleanCode = code.toUpperCase().trim();

  // Find the game
  const { data: game } = await supabase
    .from("games")
    .select("id, status, player1_uid")
    .eq("join_code", cleanCode)
    .maybeSingle();

  if (!game) return { error: "Invalid Game Code" };
  if (game.status !== "waiting") return { error: "Game has already started" };
  if (game.player1_uid === userId) return { gameId: game.id }; // rejoining own game

  // Join it
  await supabase
    .from("games")
    .update({
      player2_uid: userId,
      status: "playing",
      last_move_at: new Date().toISOString(),
      last_move_by_uid: userId,
    })
    .eq("id", game.id);

  await supabase
    .from("active_games")
    .update({
      player2_uid: userId,
      status: "playing",
      last_move_at: new Date().toISOString(),
      last_move_by_uid: userId,
    })
    .eq("id", game.id);

  return { gameId: game.id };
}

export async function submitGuess(
  gameId: string,
  guess: string,
  userId: string,
) {
  // Check if the game is active
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select()
    .eq("id", gameId)
    .maybeSingle();

  if (!game || game.status !== "playing") {
    // 'playing' matches your DB default
    return { error: "Game is not active" };
  }
  // Check if the guess is valid (is it a real word?)
  const { data: wordData, error: wordError } = await supabase
    .from("dictionary")
    .select()
    .eq("word", guess.toLowerCase())
    .maybeSingle();

  if (!wordData) {
    console.log("Word is not valid to guess!");
    return { error: "Not a valid word to guess!" };
  }

  // Calculate the colors
  const secret = game.secret_word.toLowerCase();
  const normalizedGuess = guess.toLowerCase();

  const result = new Array(5).fill("X");
  const secretArr = secret.split("");
  const guessArr = normalizedGuess.split("");

  // Frequency map to handle duplicates correctly
  const secretFreq: Record<string, number> = {};
  for (const char of secretArr) secretFreq[char] = (secretFreq[char] || 0) + 1;

  // Find the green
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === secretArr[i]) {
      result[i] = "G";
      secretFreq[guessArr[i]]--; // use up this letter
    }
  }

  // Find yellow
  for (let i = 0; i < 5; i++) {
    const char = guessArr[i];
    if (result[i] === "X" && secretFreq[char] > 0) {
      result[i] = "Y";
      secretFreq[char]--;
    }
  }

  // combine word + colors
  const colorString = result.join("");
  const entry = `${guess.toLowerCase()}:${colorString}`;

  // DATABASE Updates
  // Identify if player is player 1 or player 2
  const isP1 = game.player1_uid === userId;
  const targetCol = isP1 ? "p1_guesses" : "p2_guesses";

  const scoreCol = isP1 ? "p1_scores" : "p2_scores";
  // Append new guess (Supabase JSONB append)
  // We store the guess word AND color result string
  // Format: "GUESS:GYXGY" (Compact storage)
  const currentGuesses = isP1 ? game.p1_guesses : game.p2_guesses;

  const currentScores = (currentGuesses || []).map((val: string) => {
    const parts = val.split(":");
    return parts[1] || ""; // Grab the color part, current guess look like ["apple:GYXXX"]
  });

  const newGuesses = [...(currentGuesses || []), entry];

  // Check Win / Draw Condition
  let newStatus = game.status;
  let winnerId = game.winner_uid;

  const isWin = guess.toLowerCase() === secret;
  const isMaxGuesses = newGuesses.length >= 6;

  if (isWin) {
    // scenario A, current user guess the word correctly
    newStatus = "finished";
    winnerId = userId;
  } else if (isMaxGuesses) {
    // scenario B, current user ran out of guesses

    // check if opponent ran out of guesses
    const opponentGuesses = isP1 ? game.p2_guesses : game.p1_guesses;
    const opponentCount = (opponentGuesses || []).length;

    // if opponent also guessed 6 times already
    if (opponentCount >= 6) {
      newStatus = "finished";
      winnerId = null; // null winner means draw
    }
    // if opponent guess is less than 6, then continue the game and just spectate for current user
  }
  // The private db
  const { error: updateError } = await supabase
    .from("games")
    .update({
      [targetCol]: newGuesses,
      status: newStatus,
      winner_uid: winnerId,
      last_move_at: new Date().toISOString(),
      last_move_by_uid: userId,
    })
    .eq("id", gameId);

  if (updateError) return { error: updateError.message };

  // The public db
  const { error: publicUpdateError } = await supabase
    .from("active_games") // the db that the client can see
    .update({
      [scoreCol]: [...currentScores, colorString],
      status: newStatus,
      winner_uid: winnerId,
      // Sync the player ID if they just joined/moved
      player2_uid: game.player2_uid,
      last_move_at: new Date().toISOString(),
      last_move_by_uid: userId,
    })
    .eq("id", gameId);

  if (publicUpdateError) return { error: publicUpdateError.message };

  return { success: true, colors: result };
}

// Rematch function
export async function requestRematch(gameId: string, userId: string) {
  // Fetch current game state
  const { data: initialGame } = await supabase
    .from("games")
    .select("player1_uid, player2_uid")
    .eq("id", gameId)
    .single();

  if (!initialGame) return { error: "Game not found" };

  // Determine which player is clicking
  const isPlayer1 = initialGame.player1_uid === userId;
  const myRematchCol = isPlayer1 ? "p1_rematch" : "p2_rematch";

  // Update the current player vote
  await supabase
    .from("games")
    .update({ [myRematchCol]: true })
    .eq("id", gameId);

  await supabase
    .from("active_games")
    .update({ [myRematchCol]: true })
    .eq("id", gameId);

  // Fetch data again after update
  const { data: freshGame } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (!freshGame) return { error: "Game error" };

  if (freshGame.rematch_id) {
    return { status: "started", newGameId: freshGame.rematch_id };
  }

  if (freshGame.p1_rematch && freshGame.p2_rematch) {
    // Create a new game

    // GET a new secret word
    const { count, error: countError } = await supabase
      .from("dictionary")
      .select("*", { count: "exact", head: true }) // dont return data and just count
      .eq("is_target", true);

    if (countError || !count) return;

    // generate random index to pick random word
    const randomIndex = Math.floor(Math.random() * count);

    // Fetch only the single word at the index
    const { data: secretWordData } = await supabase
      .from("dictionary")
      .select("word")
      .eq("is_target", true)
      .range(randomIndex, randomIndex)
      .single();

    const secret = secretWordData?.word;

    // Create the new game row
    const { data: newGame, error } = await supabase
      .from("games")
      .insert({
        player1_uid: freshGame.player1_uid,
        player2_uid: freshGame.player2_uid,
        status: "playing",
        secret_word: secret,
        is_private: freshGame.is_private,
        join_code: freshGame.join_code,
        last_move_at: new Date().toISOString(),
        last_move_by_uid: freshGame.player1_uid,
      })
      .select("id")
      .single();

    if (error || !newGame) return { error: "Failed to create rematch" };

    // Create Public Mirror
    await supabase.from("active_games").insert({
      id: newGame.id,
      player1_uid: freshGame.player1_uid,
      player2_uid: freshGame.player2_uid,
      status: "playing",
      is_private: freshGame.is_private,
      join_code: freshGame.join_code,
      p1_scores: [],
      p2_scores: [],
      last_move_at: new Date().toISOString(),
      last_move_by_uid: freshGame.player1_uid,
    });

    // Link old game to the new game
    await supabase
      .from("games")
      .update({ rematch_id: newGame.id })
      .eq("id", gameId);
    await supabase
      .from("active_games")
      .update({ rematch_id: newGame.id })
      .eq("id", gameId);

    return { status: "started", newGameId: newGame.id };
  }

  return { status: "waiting" };
}

export async function cancelRematch(gameId: string, userId: string) {
  // identify who is calling
  const { data: game } = await supabase
    .from("games")
    .select("player1_uid, player2_uid")
    .eq("id", gameId)
    .single();

  if (!game) return;

  const isPlayer1 = game.player1_uid === userId;
  const myRematchCol = isPlayer1 ? "p1_rematch" : "p2_rematch";
  // clear both rematch col
  const updates = { [myRematchCol]: false };

  await Promise.all([
    supabase.from("games").update(updates).eq("id", gameId),
    supabase.from("active_games").update(updates).eq("id", gameId),
  ]);
  revalidatePath(`/game/${gameId}`);
  return { success: true };
}

export async function claimInactivityWin(gameId: string, userId: string) {
  const { data: game, error } = await supabase
    .from("active_games")
    .select("last_move_at, status, player1_uid, player2_uid")
    .eq("id", gameId)
    .single();

  if (error || !game) {
    return { error: "Game not found." };
  }

  if (game.status !== "playing") {
    return { error: "Game is already finished." };
  }

  // Verify the Claimant is actually in the game
  if (game.player1_uid !== userId && game.player2_uid !== userId) {
    return { error: "You are not a player in this game." };
  }

  // Check the time
  const lastMove = new Date(game.last_move_at).getTime();
  const now = new Date().getTime();
  const diffInSeconds = (now - lastMove) / 1000;
  const TIMEOUT_LIMIT = 120;

  if (diffInSeconds < TIMEOUT_LIMIT) {
    const remaining = Math.ceil(TIMEOUT_LIMIT - diffInSeconds);
    return { error: `Too early! Wait ${remaining} more seconds.` };
  }

  const updates = {
    status: "finished",
    winner_uid: userId, // the person who click the button wins
  };

  // Update both tables to ensure consistency
  const { error: updateError } = await supabase
    .from("active_games")
    .update(updates)
    .eq("id", gameId);

  const { error: updateErrorPrivate } = await supabase
    .from("games")
    .update(updates)
    .eq("id", gameId);

  if (updateError) return { error: "Failed to update game status." };
  if (updateErrorPrivate) return { error: "Failed to update game status." };
  await supabase.from("games").update(updates).eq("id", gameId);

  revalidatePath(`/game/${gameId}`);
  return { success: true };
}
