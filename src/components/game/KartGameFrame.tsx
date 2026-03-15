import { useEffect, useRef } from "react";
import type { LaunchPayload, ResultPayload } from "@/types/kart";

interface Props {
  joinCode: string;
  isHost: boolean;
  player: LaunchPayload["player"];
  onResult: (result: ResultPayload) => void;
  onExit: () => void;
}

export function KartGameFrame({
  joinCode, isHost, player, onResult, onExit
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const GAME_ORIGIN = import.meta.env.VITE_GAME_ORIGIN || window.location.origin;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== GAME_ORIGIN) return;

      const msg = event.data;
      if (msg.type === "COSPIRA_READY") {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "COSPIRA_LAUNCH",
            joinCode,
            isHost,
            player,
          } satisfies LaunchPayload,
          GAME_ORIGIN
        );
      }
      if (msg.type === "COSPIRA_RESULT") onResult(msg);
      if (msg.type === "COSPIRA_EXIT") onExit();
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [joinCode, isHost, player, onResult, onExit, GAME_ORIGIN]);

  return (
    <iframe
      ref={iframeRef}
      src="/games/kart-racing/index.html"
      style={{ width: "100%", height: "100%", border: "none" }}
      allow="autoplay; fullscreen"
      sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      title="Kart Racing"
    />
  );
}