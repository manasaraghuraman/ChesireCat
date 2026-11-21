/**
 * File: lib/sse.ts
 * Purpose: Server-sent events helpers: the streaming pattern API routes use to
 *          send NPC lines, narration, and verdicts to the client.
 * Author: varenya
 * Date: 2026-11-21
 */

export interface SseEvent {
  readonly event: string;
  readonly data: unknown;
}

const encoder = new TextEncoder();

/** One SSE frame. Data is JSON so multi-line text can't break the framing. */
export function formatSse({ event, data }: SseEvent): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Turns an async generator of events into an SSE Response. If the generator
 * throws, an `error` event is sent (no internals) and the stream closes.
 */
export function sseResponse(
  events: AsyncIterable<SseEvent>,
  onError?: (error: unknown) => void,
): Response {
  const iterator = events[Symbol.asyncIterator]();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(formatSse(value)));
      } catch (error) {
        onError?.(error);
        controller.enqueue(
          encoder.encode(formatSse({ event: "error", data: { message: "Something went wrong." } })),
        );
        controller.close();
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Client-side parser: splits an SSE byte stream back into events. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = parseFrame(buffer.slice(0, boundary));
        if (frame) yield frame;
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): SseEvent | undefined {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7);
    else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
  }
  if (dataLines.length === 0) return undefined;
  return { event, data: JSON.parse(dataLines.join("\n")) };
}
