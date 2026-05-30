import type { ServerResponse } from "http";
import type { SseEmitter } from "./types.js";

export class SseEmitterImpl implements SseEmitter {
  constructor(private raw: ServerResponse) {}

  send(event: string, data: unknown): void {
    try {
      this.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      // stream closed, swallow
    }
  }

  sendProgress(phase: string): void {
    this.send("progress", { phase });
  }

  sendToken(token: string): void {
    this.send("token", { token });
  }

  sendError(message: string): void {
    this.send("error", { message });
  }

  sendDone(): void {
    this.send("done", {});
  }

  rawWrite(data: string): void {
    try {
      this.raw.write(data);
    } catch {
      // stream closed
    }
  }
}
