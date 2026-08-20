import { useTranslation } from "react-i18next";
import Avatar from "../ui/Avatar";
import { usePresence } from "../../context/PresenceContext";
import RoleSelector from "./RoleSelector";

const ROLE_STYLES = {
  MANAGER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SUPERVISOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const ROLE_LEVEL = { MANAGER: 3, SUPERVISOR: 2, MEMBER: 1 };

export default function MemberRow({ member, currentUserId, currentRole, onRoleChange, onRemove }) {
  const { t } = useTranslation();
  const { isOnline } = usePresence();
  const user = member.user;
  const isSelf = member.userId === currentUserId;
  const currentLevel = ROLE_LEVEL[currentRole] || 0;
  const targetLevel = ROLE_LEVEL[member.role] || 0;
  const canActOnTarget = currentRole === "MANAGER" && !isSelf && currentLevel > targetLevel;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
      <Avatar user={user} name={user?.name} size="md" online={user ? isOnline(user.id) : undefined} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
          {user?.name || "Unknown"}
          {isSelf && (
            <span className="ms-1.5 text-xs text-text-muted-light dark:text-text-muted-dark font-normal">
              ({t("common.you").toLowerCase()})
            </span>
          )}
        </p>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
          {user?.email}
        </p>
      </div>
      {canActOnTarget ? (
        <RoleSelector
          value={member.role}
          onChange={(newRole) => onRoleChange(member.userId, newRole)}
        />
      ) : (
        <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " + (ROLE_STYLES[member.role] || ROLE_STYLES.MEMBER)}>
          {t("roles." + member.role) || member.role}
        </span>
      )}
      {canActOnTarget && (
        <button
          type="button"
          onClick={() => onRemove(member.userId)}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-text-muted-light dark:text-text-muted-dark hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label={t("common.remove")}
          title={t("common.remove")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
