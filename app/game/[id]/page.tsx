import GameClient from "./GameClient";
import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data: game } = await supabase
    .from("active_games")
    .select("status")
    .eq("id", id)
    .single();

  if (!game) {
    return { title: "Game Not Found | Duelle" };
  }

  // Generate waiting card
  if (game.status === "waiting") {
    return {
      title: "⚔️ Challenge me to Duelle!",
      description: "Jump into the match and let’s see who comes out on top.",
      openGraph: {
        title: "⚔️ Challenge me to Duelle!",
        description: "Jump into the match and let’s see who comes out on top.",
        type: "website",
      },
    };
  }

  return {
    title: "Live Match | Duelle",
    description: "A match is currently in progress!",
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GameClient key={`game-${id}`} id={id} />;
}
