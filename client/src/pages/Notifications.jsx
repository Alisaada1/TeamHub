import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { queryKeys } from "../api/queryKeys";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import Avatar from "../components/ui/Avatar";
import { BellIcon } from "../components/icons/Icons";
import { toast } from "../utils/toast";
import { getNotificationMessage } from "../utils/localizedText";
import { notificationHref } from "../utils/notificationHref";

function timeAgo(iso, t) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return t("dashboard.justNow");
  if (diffMin < 60) return t("dashboard.minutesAgo", { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("dashboard.hoursAgo", { count: diffH });
  return t("dashboard.daysAgo", { count: Math.floor(diffH / 24) });
}

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useLocalUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.listNotifications(user.id),
    enabled: !!user,
    retry: false,
  });

  const items = data?.data || [];

  useEffect(() => {
    if (!user) return;
    api.markAllNotificationsRead(user.id).then(() => {
      queryClient.setQueryData(queryKeys.notifications, (old) =>
        old ? { ...old, data: (old.data || []).map((n) => ({ ...n, read: true })) } : old
      );
    });
  }, [user, queryClient]);

  const patchItem = (id, patch) => {
    queryClient.setQueryData(queryKeys.notifications, (old) =>
      old ? { ...old, data: (old.data || []).map((n) => (n.id === id ? { ...n, ...patch } : n)) } : old
    );
  };

  const markReadMutation = useMutation({
    mutationFn: (id) => api.markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const prev = queryClient.getQueryData(queryKeys.notifications);
      patchItem(id, { read: true });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.notifications, ctx.prev);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (entityId) => api.acceptInvitation(entityId),
    onSuccess: (_res, entityId) => {
      const notif = (items.find((n) => n.entityId === entityId) || {});
      toast.success(t("notifications.invitationAccepted", "Invitation accepted"));
      patchItem(notif.id, { read: true, type: "INVITATION_ACCEPTED" });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.response?.data?.error || err?.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (entityId) => api.rejectInvitation(entityId),
    onSuccess: (_res, entityId) => {
      const notif = (items.find((n) => n.entityId === entityId) || {});
      toast.success(t("notifications.invitationRejected", "Invitation declined"));
      patchItem(notif.id, { read: true, type: "INVITATION_REJECTED" });
    },
    onError: (err) => {
      toast.error(t("common.error"), err?.response?.data?.error || err?.message);
    },
  });

  function handleClick(n) {
    if (!n.read) markReadMutation.mutate(n.id);
    navigate(notificationHref(n));
  }

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError) return <ErrorState title={t("common.error")} message={error?.message} onRetry={refetch} t={t} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {t("notifications.title")}
        </h1>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
          {t("notifications.subtitle")}
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<BellIcon size={32} />}
          title={t("notifications.empty.title")}
        />
      ) : (
        <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark overflow-hidden divide-y divide-border-light dark:divide-border-dark">
          {items.map((n) => {
            const isProcessing = (acceptMutation.isPending && acceptMutation.variables === n.entityId) ||
              (rejectMutation.isPending && rejectMutation.variables === n.entityId);
            const isInvitation = n.type === "INVITATION";
            const localized = getNotificationMessage(n, t, i18n.language);
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark ${!n.read ? "bg-primary-50/40 dark:bg-primary-900/10" : ""}`}
                onClick={() => handleClick(n)}
              >
                <Avatar name={n.actor?.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary-light dark:text-text-primary-dark">
                    {localized ? (
                      <span>{localized}</span>
                    ) : (
                      <>
                        {n.actor && <span className="font-semibold">{n.actor.name}</span>}{" "}
                        <span className="text-text-muted-light dark:text-text-muted-dark">{n.message || n.title}</span>
                      </>
                    )}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark">
                    {n.team?.name && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
                        style={{ backgroundColor: `${n.team.color || "#6366f1"}1a`, color: n.team.color || "#6366f1" }}
                      >
                        {n.team.name}
                      </span>
                    )}
                    <span>{timeAgo(n.createdAt, t)}</span>
                  </div>
                  {isInvitation && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => { e.stopPropagation(); acceptMutation.mutate(n.entityId); }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                      >
                        {t("notifications.accept", "Accept")}
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(n.entityId); }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50"
                      >
                        {t("notifications.reject", "Reject")}
                      </button>
                    </div>
                  )}
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-primary-500 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
