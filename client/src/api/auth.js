import client from "./client";

export async function signIn(email) {
  const { data } = await client.post("/auth/sign-in", { email });
  return data;
}

export async function signUp(name, email) {
  const { data } = await client.post("/auth/sign-up", { name, email });
  return data;
}

export async function getCurrentUser() {
  const { data } = await client.get("/users/me");
  return data;
}

export async function updateCurrentUser(patch) {
  const { data } = await client.put("/users/me", patch);
  return data;
}

export async function deleteAccount() {
  const { data } = await client.delete("/users/me");
  return data;
}
