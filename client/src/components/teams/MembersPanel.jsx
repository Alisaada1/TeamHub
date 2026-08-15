import { useState, useMemo } from "react";
import MemberRow from "./MemberRow";
import { PlusIcon, SearchIcon } from "../icons/Icons";

const ROLE_ORDER = ["MANAGER", "SUPERVISOR", "MEMBER"];

export default function MembersPanel({ members, currentUserId, currentRole, onInvite, onRoleChange, onRemove, t }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedRoles, setCollapsedRoles] = useState({});
  const canInvite = currentRole === "MANAGER" || currentRole === "SUPERVISOR";

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) => {
      const name = m.user?.name || m.name || "";
      const email = m.user?.email || m.email || "";
      return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
    });
  }, [members, searchQuery]);

  const grouped = useMemo(() => {
    const map = {};
    for (const role of ROLE_ORDER) {
      map[role] = [];
    }
    for (const m of filteredMembers) {
      const role = m.role || "MEMBER";
      if (!map[role]) map[role] = [];
      map[role].push(m);
    }
    return ROLE_ORDER.filter((role) => map[role].length > 0).map((role) => ({
      role,
      members: map[role],
    }));
  }, [filteredMembers]);

  function toggleRole(role) {
    setCollapsedRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark" size={14} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("teams.form.searchPlaceholder")}
            className="w-full ps-9 pe-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-sm text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors" />
        </div>
        {canInvite && (
          <button type="button" onClick={onInvite}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium transition-colors shrink-0">
            <PlusIcon size={14} />
            <span>{t("teams.inviteMember")}</span>
          </button>
        )}
      </div>

      {members.length === 0 ? (
          <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-6 text-center">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t("teams.noMembers")}</p>
        </div>
      ) : grouped.length === 0 ? (
          <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-6 text-center">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{t("teams.errors.noUsersFound")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ role, members: roleMembers }) => (
            <div key={role}>
              <button
                type="button"
                onClick={() => toggleRole(role)}
                className="flex items-center gap-2 w-full text-start mb-2 group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-muted-light dark:text-text-muted-dark transition-transform ${collapsedRoles[role] ? "" : "rotate-90"}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark font-semibold">
                  {t("roles." + role)} ({roleMembers.length})
                </span>
              </button>
              {!collapsedRoles[role] && (
                <div className="space-y-1.5">
                  {roleMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      currentUserId={currentUserId}
                      currentRole={currentRole}
                      onRoleChange={onRoleChange}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
