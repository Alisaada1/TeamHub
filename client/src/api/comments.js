import client from "./client";

export async function listTaskComments(taskId) {
  const { data } = await client.get(`/tasks/${taskId}/comments`);
  return data;
}

export async function addTaskComment(taskId, payload) {
  const { data } = await client.post(`/tasks/${taskId}/comments`, payload);
  return data;
}

export async function togglePinComment(commentId) {
  const { data } = await client.patch(`/comments/${commentId}/pin`);
  return data;
}

export async function updateComment(commentId, payload) {
  const { data } = await client.put(`/comments/${commentId}`, payload);
  return data;
}

export async function deleteComment(commentId) {
  const { data } = await client.delete(`/comments/${commentId}`);
  return data;
}

export async function getPinnedComments(taskId) {
  const { data } = await client.get(`/tasks/${taskId}/comments/pinned`);
  return data;
}

export async function toggleTaskComments(taskId) {
  const { data } = await client.patch(`/tasks/${taskId}/comments-toggle`);
  return data;
}

export async function getDashboardPinnedComments(teamId) {
  const params = teamId ? { teamId } : {};
  const { data } = await client.get("/dashboard/pinned-comments", { params });
  return data;
}
