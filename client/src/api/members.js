import client from "./client";

export async function listMembers(teamId) {
  const { data } = await client.get(`/teams/${teamId}/members`);
  return data;
}

export async function updateMemberRole(teamId, memberId, role) {
  const { data } = await client.patch(`/teams/${teamId}/members/${memberId}`, { role });
  return data;
}

export async function removeMember(teamId, userId) {
  const { data } = await client.delete(`/teams/${teamId}/members/${userId}`);
  return data;
}

export async function leaveTeam(teamId) {
  const { data } = await client.delete(`/teams/${teamId}/leave`);
  return data;
}
