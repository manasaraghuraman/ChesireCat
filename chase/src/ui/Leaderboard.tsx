import { useEffect, useState } from "preact/hooks";
import {
  downloadGhost,
  online,
  scores,
  submission,
  type Row,
} from "../net/online";
import type { LevelId } from "../config/courses";
export function Leaderboard({
  id,
  race,
  afterFinish = false,
}: {
  id: LevelId;
  race: () => void;
  afterFinish?: boolean;
}) {
  const [board, setBoard] = useState<{ top: Row[]; own: Row | null } | null>(
      null,
    ),
    [message, setMessage] = useState("Loading times…");
  useEffect(() => {
    let active = true;
    setBoard(null);
    setMessage("Loading times…");
    if (online && id !== "c1_l1")
      (async () => {
        const posted = afterFinish ? await submission : false;
        const result = await scores(id);
        if (active) {
          setBoard(result);
          setMessage(afterFinish && !posted ? "Local run only." : "");
        }
      })().catch(() => {
        if (active) setMessage("Leaderboard unavailable. Local play is ready.");
      });
    return () => {
      active = false;
    };
  }, [id, afterFinish]);
  if (id === "c1_l1")
    return <p>Footprint challenge times are saved on this device.</p>;
  if (!online)
    return <p>Leaderboards are offline. Times are saved on this device.</p>;
  return (
    <section>
      <h3>Leaderboard</h3>
      {message && <p role="status">{message}</p>}
      {board && (
        <>
          {board.top.length ? (
            <ol>
              {board.top.map((r) => (
                <li key={r.player_id} value={r.place}>
                  {r.display_name} · {(r.final_time_ms / 1000).toFixed(3)} s
                </li>
              ))}
            </ol>
          ) : (
            <p>No published times yet.</p>
          )}
          {board.own && <p>Your rank · {board.own.place}</p>}
          {board.top[0] && (
            <button
              onClick={async () => {
                try {
                  await downloadGhost(id, board.top[0].ghost_path);
                  race();
                } catch {
                  setMessage("Could not download the leading ghost.");
                }
              }}
            >
              Race the leading ghost
            </button>
          )}
        </>
      )}
    </section>
  );
}
