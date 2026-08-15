import client from "./client";

export async function inviteUser(teamId, email, role) {
  const { data } = await client.post(`/invitations/team/${teamId}`, { email, role });
  return data;
}

export async function listPendingByTeam(teamId) {
  const { data } = await client.get(`/invitations/team/${teamId}`);
  return data;
}

export async function listPendingByEmail() {
  const { data } = await client.get("/invitations/pending");
  return data;
}

export async function cancelInvitation(invitationId) {
  const { data } = await client.delete(`/invitations/${invitationId}`);
  return data;
}

export async function acceptInvitation(invitationId) {
  const { data } = await client.post(`/invitations/${invitationId}/accept`);
  return data;
}

export async function rejectInvitation(invitationId) {
  const { data } = await client.post(`/invitations/${invitationId}/reject`);
  return data;
}
