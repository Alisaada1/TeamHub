import client from "./client";

export async function listTasks(projectId) {
  const { data } = await client.get(`/projects/${projectId}/tasks`);
  return data;
}

export async function listTeamTasks(teamId) {
  const params = { scope: "all", teamId };
  const { data } = await client.get("/tasks", { params });
  return data;
}

export async function getTask(id) {
  const { data } = await client.get(`/tasks/${id}`);
  return data;
}

export async function createTask(projectId, payload) {
  const { data } = await client.post(`/projects/${projectId}/tasks`, payload);
  return data;
}

export async function updateTask(id, patch) {
  const { data } = await client.put(`/tasks/${id}`, patch);
  return data;
}

export async function updateTaskStatus(id, status) {
  const { data } = await client.patch(`/tasks/${id}/status`, { status });
  return data;
}

export async function deleteTask(id) {
  const { data } = await client.delete(`/tasks/${id}`);
  return data;
}
