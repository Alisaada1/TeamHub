import client from "./client";

function withTeamId(url, teamId) {
  return teamId ? `${url}?teamId=${encodeURIComponent(teamId)}` : url;
}

export async function getTeamOverview(teamId) {
  const { data } = await client.get(withTeamId("/dashboard/overview", teamId));
  return data;
}

export async function getUserOverview(teamId) {
  const { data } = await client.get(withTeamId("/dashboard/user-overview", teamId));
  return data;
}

export async function getDashboardProjects(teamId) {
  const { data } = await client.get(withTeamId("/dashboard/projects", teamId));
  return data;
}

export async function getDashboardMyTasks(teamId) {
  const { data } = await client.get(withTeamId("/dashboard/my-tasks", teamId));
  return data;
}

export async function getDashboardOverdueTasks(teamId) {
  const { data } = await client.get(withTeamId("/dashboard/overdue-tasks", teamId));
  return data;
}

export async function getDashboardInProgressTasks(teamId) {
  const { data } = await client.get(withTeamId("/dashboard/in-progress-tasks", teamId));
  return data;
}

export async function getDashboardRecentActivity(teamId) {
  const params = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const { data } = await client.get(`/dashboard/recent-activity${params}`);
  return data;
}
