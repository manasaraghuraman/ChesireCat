import { createClient } from "npm:@supabase/supabase-js@2.49.8";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, x-client-info, content-type",
  "Content-Type": "application/json",
};
export function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers });
}
export function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export type Service = ReturnType<typeof service>;
type Handler = (
  db: Service,
  player: string,
  body: Record<string, unknown>,
) => Promise<Response>;
export function serve(limit: number, handler: Handler) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return response(null);
    if (req.method !== "POST") return response("POST required", 405);
    const token = req.headers
      .get("Authorization")
      ?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return response("Sign in required", 401);
    try {
      const db = service(),
        { data, error } = await db.auth.getUser(token);
      if (error || !data.user) return response("Invalid session", 401);
      const reader = req.body?.getReader();
      if (!reader) return response("Missing input", 400);
      const decoder = new TextDecoder();
      let length = 0,
        raw = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) {
          await reader.cancel();
          return response("Input too large", 413);
        }
        raw += decoder.decode(value, { stream: true });
      }
      let body;
      try {
        body = JSON.parse(raw + decoder.decode());
      } catch {
        return response("Invalid JSON", 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        return response("Invalid input", 400);
      return await handler(db, data.user.id, body);
    } catch {
      return response("Service unavailable", 503);
    }
  });
}
