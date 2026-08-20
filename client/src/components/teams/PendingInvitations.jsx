import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPendingByTeam, cancelInvitation } from "../../api";
import { queryKeys } from "../../api/queryKeys";
import { toast } from "../../utils/toast";

const ROLE_STYLES = {
  MANAGER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SUPERVISOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function PendingInvitations({ teamId, currentRole }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canCancel = currentRole === "MANAGER" || currentRole === "SUPERVISOR";

  const invitationsQuery = useQuery({
    queryKey: queryKeys.invitationsPending(teamId),
    queryFn: () => listPendingByTeam(teamId),
    enabled: !!teamId,
    retry: false,
  });

  const invitations = invitationsQuery.data?.data || [];

  const cancelMutation = useMutation({
    mutationFn: (inviteId) => cancelInvitation(inviteId),
    onMutate: async (inviteId) => {
      const key = queryKeys.invitationsPending(teamId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) =>
        old ? { ...old, data: (old.data || []).filter((inv) => inv.id !== inviteId) } : old
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success(t("invitations.cancelled", "Invitation cancelled"));
    },
    onError: (_err, _inviteId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.invitationsPending(teamId), ctx.prev);
      toast.error(t("common.error"));
    },
  });

  if (invitationsQuery.isLoading || invitations.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-text-muted-light dark:text-text-muted-dark font-semibold px-1">
        {t("invitations.pending", "Pending Invitations")} ({invitations.length})
      </p>
      {invitations.map((inv) => (
        <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-light dark:bg-bg-dark border border-dashed border-border-light dark:border-border-dark">
          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-300 text-sm font-semibold">
            {inv.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
              {inv.email}
            </p>
            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
              {t("invitations.invitedBy", "Invited by")} {inv.invitedBy?.name || "—"}
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_STYLES[inv.role] || ROLE_STYLES.MEMBER}`}>
            {t("roles." + inv.role)}
          </span>
          {canCancel && (
            <button
              type="button"
              onClick={() => cancelMutation.mutate(inv.id)}
              disabled={cancelMutation.isPending && cancelMutation.variables === inv.id}
              className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending && cancelMutation.variables === inv.id ? t("common.loading") : t("invitations.cancel", "Cancel")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
