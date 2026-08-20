export function notificationHref(n) {
  if (n.type === "MEMBER_REMOVED") return "/dashboard";
  if (
    n.type === "MEMBER_ADDED" ||
    n.type === "ROLE_CHANGED" ||
    n.type === "MEMBER_LEFT" ||
    n.type === "INVITATION" ||
    n.type === "INVITATION_ACCEPTED" ||
    n.type === "INVITATION_REJECTED"
  )
    return "/members";
  if (n.link) return `/projects?projectId=${n.link}`;
  return "/notifications";
}
