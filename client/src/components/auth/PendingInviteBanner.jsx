import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPendingByEmail, acceptInvitation, rejectInvitation } from "../../api";
import { queryKeys, invalidateQueryCache } from "../../api/queryKeys";
import { useWorkspace } from "../../context/WorkspaceContext";
import { toast } from "../../utils/toast";
import { CheckIcon, XIcon } from "../icons/Icons";

export default function PendingInviteBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loadTeams } = useWorkspace();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  const invitationsQuery = useQuery({
    queryKey: queryKeys.invitationsPendingMe,
    queryFn: listPendingByEmail,
    retry: false,
  });
  const invitations = invitationsQuery.data?.data || [];
  const loading = invitationsQuery.isLoading;

  const acceptMutation = useMutation({
    mutationFn: (id) => acceptInvitation(id),
    onSuccess: () => {
      toast.success(t("invitations.accepted", "Invitation accepted!"));
      invalidateQueryCache(queryClient, "invitation", "team");
      loadTeams();
    },
    onError: (err) => toast.error(t("common.error"), err?.response?.data?.error || err?.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => rejectInvitation(id),
    onSuccess: () => {
      toast.success(t("invitations.rejected", "Invitation declined"));
      invalidateQueryCache(queryClient, "invitation");
    },
    onError: (err) => toast.error(t("common.error"), err?.response?.data?.error || err?.message),
  });

  function handleAccept(inv) {
    setProcessingId(inv.id);
    acceptMutation.mutate(inv.id, { onSettled: () => setProcessingId(null) });
  }

  function handleReject(inv) {
    setProcessingId(inv.id);
    rejectMutation.mutate(inv.id, { onSettled: () => setProcessingId(null) });
  }

  if (loading || invitations.length === 0) return null;

  return (
    <div className="space-y-2">
      {invitations.map((inv) => (
        <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary-50/60 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
              {t("invitations.bannerTitle", "You've been invited to join")}
            </p>
            <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">
              <span className="font-semibold text-primary-600 dark:text-primary-400">{inv.team?.name}</span>
              {inv.role !== "MEMBER" && (
                <span className="ms-1 text-xs px-1.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-800/30 text-primary-700 dark:text-primary-300 font-medium">
                  {t("roles." + inv.role)}
                </span>
              )}
              {inv.invitedBy?.name && (
                <span className="ms-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                  — {t("invitations.by", "by")} {inv.invitedBy.name}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleAccept(inv)}
              disabled={processingId === inv.id}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <CheckIcon size={12} />
              {t("invitations.accept", "Accept")}
            </button>
            <button
              type="button"
              onClick={() => handleReject(inv)}
              disabled={processingId === inv.id}
              className="inline-flex items-center gap-1 rounded-lg border border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark disabled:opacity-50 text-text-primary-light dark:text-text-primary-dark px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <XIcon size={12} />
              {t("invitations.reject", "Reject")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
