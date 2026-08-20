import client from "./client";

export async function listProjects(workspaceId) {
  const params = workspaceId ? { teamId: workspaceId } : {};
  const { data } = await client.get("/projects", { params });
  return data;
}

export async function getProject(id) {
  const { data } = await client.get(`/projects/${id}`);
  return data;
}

export async function createProject(teamId, payload) {
  const { data } = await client.post(`/teams/${teamId}/projects`, payload);
  return data;
}

export async function updateProject(id, patch) {
  const { data } = await client.put(`/projects/${id}`, patch);
  return data;
}

export async function deleteProject(id) {
  const { data } = await client.delete(`/projects/${id}`);
  return data;
}
