"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@/lib/supabase";

export function useOnlineCount() {
  const [onlineCount, setOnlineCount] = useState(0);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Creates a channel to track presence
    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: crypto.randomUUID(),
        },
      },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        // Get the state of everyone in the room
        const newState = channel.presenceState();
        // Count the number of keys (users)
        // newState looks like: { "uuid-1": [data], "uuid-2": [data] }
        const count = Object.keys(newState).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Register this connection as present in this channel.
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => {
      channel.unsubscribe();
    };
  }, [supabase]);
  return onlineCount;
}
