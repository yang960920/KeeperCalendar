import PusherServer from "pusher";

// 전역 스코프에 인스턴스를 유지하여 개발 환경에서 핫 리로드 시 중복 생성 방지
const globalForPusher = global as unknown as { pusherServer: PusherServer };

export const pusherServer =
    globalForPusher.pusherServer ||
    new PusherServer({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        useTLS: true,
    });

if (process.env.NODE_ENV !== "production") globalForPusher.pusherServer = pusherServer;
