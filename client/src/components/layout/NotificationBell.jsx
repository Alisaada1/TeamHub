import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead, markAllNotificationsRead, acceptInvitation, rejectInvitation } from "../../api";
import { useLocalUser } from "../../context/LocalUserContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { queryKeys } from "../../api/queryKeys";
import { toast } from "../../utils/toast";
import { getNotificationMessage } from "../../utils/localizedText";
import { notificationHref } from "../../utils/notificationHref";
import Avatar from "../ui/Avatar";
import { BellIcon, CheckIcon, XIcon } from "../icons/Icons";

function timeAgo(iso, t) {
  const now = new Date();
  const then = new Date(iso);
  const diffMin = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (diffMin < 1) return t("notifications.time.justNow");
  if (diffMin < 60) return t("notifications.time.minutesAgo", { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("notifications.time.hoursAgo", { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return t("notifications.time.daysAgo", { count: diffD });
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useLocalUser();
  const { loadTeams } = useWorkspace();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => listNotifications(user.id),
    enabled: !!user,
    refetchInterval: 15000,
    retry: false,
  });

  const items = notificationsQuery.data?.data || [];

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, ref]);

  const visible = items;
  const unread = visible.filter((n) => !n.read).length;
  const recent = visible.slice(0, 5);

  const patchItem = (id, patch) => {
    queryClient.setQueryData(queryKeys.notifications, (old) =>
      old ? { ...old, data: (old.data || []).map((x) => (x.id === id ? { ...x, ...patch } : x)) } : old
    );
  };

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
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

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(user.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications });
      const prev = queryClient.getQueryData(queryKeys.notifications);
      queryClient.setQueryData(queryKeys.notifications, (old) =>
        old ? { ...old, data: (old.data || []).map((x) => ({ ...x, read: true })) } : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.notifications, ctx.prev);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (entityId) => acceptInvitation(entityId),
    onSuccess: (_res, entityId) => {
      const notif = items.find((n) => n.entityId === entityId) || {};
      toast.success(t("notifications.invitationAccepted", "Invitation accepted"));
      patchItem(notif.id, { read: true });
      loadTeams();
    },
    onError: (e) => {
      toast.error(e?.response?.data?.error || e?.message || t("common.error"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (entityId) => rejectInvitation(entityId),
    onSuccess: (_res, entityId) => {
      const notif = items.find((n) => n.entityId === entityId) || {};
      toast.success(t("notifications.invitationRejected", "Invitation rejected"));
      patchItem(notif.id, { read: true });
    },
    onError: (e) => {
      toast.error(e?.response?.data?.error || e?.message || t("common.error"));
    },
  });

  async function handleClick(n) {
    if (n.type === "INVITATION") return;
    if (!n.read) markReadMutation.mutate(n.id);
    setOpen(false);
    navigate(notificationHref(n));
  }

  function handleAccept(n) {
    acceptMutation.mutate(n.entityId);
  }

  function handleReject(n) {
    rejectMutation.mutate(n.entityId);
  }

  function handleMarkAll() {
    if (!user) return;
    markAllMutation.mutate();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
        aria-label={t("notifications.title")}
      >
        <BellIcon size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 sm:w-96 rounded-xl shadow-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-light dark:border-border-dark">
            <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
              {t("notifications.title")}
            </h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs font-medium text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto scrollbar-thin">
            {recent.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-text-muted-light dark:text-text-muted-dark">
                {t("notifications.empty.description")}
              </li>
            ) : (
              recent.map((n) => {
                const isProcessing = (acceptMutation.isPending && acceptMutation.variables === n.entityId) ||
                  (rejectMutation.isPending && rejectMutation.variables === n.entityId);
                return (
                  <li key={n.id}>
                    {n.type === "INVITATION" && !n.read ? (
                      <div className={`flex flex-col gap-2 px-4 py-2.5 ${!n.read ? "bg-primary-50/40 dark:bg-primary-900/10" : ""}`}>
                        <div className="flex items-start gap-3">
                          <Avatar name={n.actor?.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary-light dark:text-text-primary-dark">
                              {n.title}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark">
                              {n.team?.name && (
                                <span
                                  className="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
                                  style={{ backgroundColor: `${n.team.color || "#6366f1"}1a`, color: n.team.color || "#6366f1" }}
                                >
                                  {n.team.name}
                                </span>
                              )}
                              <span>{timeAgo(n.createdAt, t)}</span>
                            </div>
                          </div>
                          {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" aria-label={t("notifications.unread")} />}
                        </div>
                        <div className="flex items-center gap-2 ps-11">
                          <button type="button" onClick={() => handleAccept(n)} disabled={isProcessing}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-medium transition-colors">
                            <CheckIcon size={12} />
                            {t("notifications.accept", "Accept")}
                          </button>
                          <button type="button" onClick={() => handleReject(n)} disabled={isProcessing}
                            className="inline-flex items-center gap-1 rounded-lg border border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark disabled:opacity-50 text-text-primary-light dark:text-text-primary-dark px-3 py-1.5 text-xs font-medium transition-colors">
                            <XIcon size={12} />
                            {t("notifications.reject", "Reject")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => handleClick(n)}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors ${!n.read ? "bg-primary-50/40 dark:bg-primary-900/10" : ""}`}>
                        <Avatar name={n.actor?.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary-light dark:text-text-primary-dark">
                            {getNotificationMessage(n, t, i18n.language) || n.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark">
                            {n.team?.name && (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
                                style={{ backgroundColor: `${n.team.color || "#6366f1"}1a`, color: n.team.color || "#6366f1" }}
                              >
                                {n.team.name}
                              </span>
                            )}
                            <span>{timeAgo(n.createdAt, t)}</span>
                          </div>
                        </div>
                        {!n.read && <span className="mt-1 h-2 w-2 rounded-full bg-primary-500 flex-shrink-0" aria-label={t("notifications.unread")} />}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          <div className="px-4 py-2 border-t border-border-light dark:border-border-dark text-center">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate("/notifications"); }}
              className="text-xs font-medium text-primary-600 dark:text-primary-300 hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
            >
              {t("notifications.viewAll")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
