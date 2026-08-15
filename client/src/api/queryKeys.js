export const queryKeys = {
  user: ["user"],
  teams: ["teams"],
  team: (id) => ["team", id],
  teamMembers: (teamId) => ["team-members", teamId],
  projects: (teamId) => ["projects", teamId ?? "all"],
  project: (id) => ["project", id],
  tasks: (projectId) => ["tasks", projectId],
  task: (id) => ["task", id],
  teamTasks: (teamId) => ["team-tasks", teamId ?? "all"],
  members: (teamId) => ["members", teamId],
  comments: (taskId) => ["comments", taskId],
  pinnedComments: (taskId) => ["pinned-comments", taskId ?? "all"],
  notifications: ["notifications"],
  presence: ["presence"],
  notificationPrefs: ["notification-prefs"],
  invitationsPending: (teamId) => ["invitations", "pending", teamId],
  invitationsPendingMe: ["invitations", "pending", "me"],
  teamOverview: (teamId) => ["dashboard", "team-overview", teamId ?? "all"],
  userOverview: (teamId) => ["dashboard", "user-overview", teamId ?? "all"],
  dashboardProjects: (teamId) => ["dashboard", "projects", teamId ?? "all"],
  dashboardMyTasks: (teamId) => ["dashboard", "my-tasks", teamId ?? "all"],
  dashboardOverdue: (teamId) => ["dashboard", "overdue", teamId ?? "all"],
  dashboardInProgress: (teamId) => ["dashboard", "in-progress", teamId ?? "all"],
  dashboardActivity: (teamId) => ["dashboard", "activity", teamId ?? "all"],
  dashboardPinned: (teamId) => ["dashboard", "pinned-comments", teamId ?? "all"],
};

export const invalidations = {
  user: [queryKeys.user],
  team: [queryKeys.teams, ["team"], ["team-members"], ["members"]],
  project: [queryKeys.teams, ["projects"], ["project"], ["project-stats"]],
  task: [["task"], ["tasks"], ["kanban"], ["calendar"], ["my-tasks"], ["team-tasks"]],
  member: [["team-members"], ["members"]],
  comment: [["comments"], ["pinned-comments"]],
  notification: [queryKeys.notifications, queryKeys.notificationPrefs],
  dashboard: [
    ["dashboard"],
    ["teams"],
    ["team-members"],
    ["my-tasks"],
    ["kanban"],
  ],
  invitation: [["invitations"]],
};

export function invalidateQueryCache(queryClient, ...domains) {
  for (const domain of domains) {
    const prefixes = invalidations[domain] || [];
    for (const prefix of prefixes) {
      queryClient.invalidateQueries({ queryKey: prefix });
    }
  }
}
