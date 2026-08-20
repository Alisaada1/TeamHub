import client from "./client";

export async function sendPresenceHeartbeat() {
  const { data } = await client.post("/presence/heartbeat");
  return data;
}

export async function getOnlineUsers() {
  const { data } = await client.get("/presence/online");
  return data;
}
