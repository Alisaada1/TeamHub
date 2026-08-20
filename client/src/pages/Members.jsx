import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import { useLocalUser } from "../context/LocalUserContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useOnWorkspaceChange } from "../hooks/useOnWorkspaceChange";
import { queryKeys, invalidateQueryCache } from "../api/queryKeys";
import MembersPanel from "../components/teams/MembersPanel";
import MemberInviteSheet from "../components/teams/MemberInviteSheet";
import PendingInvitations from "../components/teams/PendingInvitations";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSkeleton from "../components/ui/LoadingSkeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import { toast } from "../utils/toast";
import { UsersIcon } from "../components/icons/Icons";

export default function Members() {
  const { t } = useTranslation();
  const { user } = useLocalUser();
  const { workspaceId, getUserRole } = useWorkspace();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState(null);

  useOnWorkspaceChange(workspaceId, () => {
    setInviteOpen(false);
    setRemoveMemberTarget(null);
  });

  const currentRole = getUserRole(workspaceId, user?.id);

  const membersQuery = useQuery({
    queryKey: queryKeys.teamMembers(workspaceId),
    queryFn: () => api.listMembers(workspaceId),
    enabled: !!workspaceId,
    retry: false,
  });

  const members = membersQuery.data?.data || [];

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }) => api.updateMemberRole(workspaceId, memberId, role),
    onSuccess: () => {
      toast.success(t("teams.toasts.roleUpdated"));
      invalidateQueryCache(queryClient, "member");
    },
    onError: () => {
      toast.error(t("teams.toasts.memberRoleUpdateFailed"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => api.removeMember(workspaceId, userId),
    onSuccess: () => {
      toast.success(t("teams.toasts.memberRemoved"));
      setRemoveMemberTarget(null);
      invalidateQueryCache(queryClient, "member");
    },
    onError: () => {
      toast.error(t("teams.toasts.memberRemoveFailed"));
      setRemoveMemberTarget(null);
    },
  });

  function handleRoleChange(memberId, newRole) {
    roleMutation.mutate({ memberId, role: newRole });
  }

  function handleRemoveMember(userId) {
    removeMutation.mutate(userId);
  }

  const currentUserId = user?.id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary-light dark:text-text-primary-dark">
          {t("members.title")}
        </h1>
        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
          {t("members.subtitle")}
        </p>
      </div>

      {!workspaceId ? (
        <EmptyState
          icon={<UsersIcon size={32} />}
          title={t("members.noTeamTitle", "Select a team first")}
          description={t("members.noTeamDesc", "Create your first team to get started with managing members.")}
        />
      ) : membersQuery.isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : membersQuery.isError ? (
        <ErrorState
          title={t("teams.errorTitle")}
          message={t("common.error")}
          onRetry={() => membersQuery.refetch()}
        />
      ) : (
        <div className="rounded-2xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
          <MembersPanel
            members={members}
            currentUserId={currentUserId}
            currentRole={currentRole}
            onInvite={() => setInviteOpen(true)}
            onRoleChange={handleRoleChange}
            onRemove={(userId) => setRemoveMemberTarget(userId)}
            t={t}
          />
        </div>
      )}

      {workspaceId && <PendingInvitations teamId={workspaceId} currentRole={currentRole} />}

      <MemberInviteSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        teamId={workspaceId}
        currentRole={currentRole}
        existingMemberIds={members.map((m) => m.userId)}
        onMemberAdded={() => invalidateQueryCache(queryClient, "member", "invitation")}
      />

      <ConfirmDialog
        open={!!removeMemberTarget}
        onClose={() => setRemoveMemberTarget(null)}
        title={t("teams.confirmRemoveTitle")}
        description={t("teams.confirmRemoveDesc")}
        confirmLabel={t("teams.removeMember")}
        onConfirm={() => handleRemoveMember(removeMemberTarget)}
        danger
      />
    </div>
  );
}
