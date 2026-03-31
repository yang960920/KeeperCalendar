import PusherClient from "pusher-js";

declare global {
  var __pusherClient: PusherClient | undefined;
}

const pusherClient: PusherClient = (() => {
  if (typeof window === "undefined") return null as any;
  if (!globalThis.__pusherClient) {
    globalThis.__pusherClient = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        enabledTransports: ["ws", "wss"],
      }
    );
  }
  return globalThis.__pusherClient;
})();

export { pusherClient };
