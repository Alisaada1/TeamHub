import client from "./client";

export async function listTeams() {
  const { data } = await client.get("/teams");
  return data;
}

export async function createTeam(payload) {
  const { data } = await client.post("/teams", payload);
  return data;
}

export async function updateTeam(id, patch) {
  const { data } = await client.put(`/teams/${id}`, patch);
  return data;
}

export async function deleteTeam(id) {
  const { data } = await client.delete(`/teams/${id}`);
  return data;
}
