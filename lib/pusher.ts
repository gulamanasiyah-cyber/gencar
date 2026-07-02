import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "2169693",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "7903183fbd733d5317dc",
  secret: process.env.PUSHER_SECRET || "47d3ddd7bd388e9576d5",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap1",
  useTLS: true,
});
