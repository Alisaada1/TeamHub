import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { listTeams, listMembers } from "../api";
import { queryKeys } from "../api/queryKeys";

const STORAGE_KEY = "teamhub_workspace_id";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const queryClient = useQueryClient();

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: listTeams,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const teams = useMemo(
    () => (teamsQuery.data?.data || []).filter((t) => !t.archived),
    [teamsQuery.data]
  );

  const memberQueries = useQueries({
    queries: teams.map((team) => ({
      queryKey: queryKeys.teamMembers(team.id),
      queryFn: () => listMembers(team.id),
      staleTime: 60000,
    })),
  });

  const teamMembersMap = useMemo(() => {
    const map = {};
    teams.forEach((team, i) => {
      map[team.id] = memberQueries[i]?.data?.data || [];
    });
    return map;
  }, [teams, memberQueries]);

  const [workspaceId, setWorkspaceIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [workspaceName, setWorkspaceName] = useState(null);

  useEffect(() => {
    if (teamsQuery.isLoading) return;
    if (teams.length === 0) {
      setWorkspaceIdState(null);
      setWorkspaceName(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedTeam = stored ? teams.find((t) => t.id === stored) : null;
    const selected = storedTeam || teams[0];
    setWorkspaceIdState(selected.id);
    setWorkspaceName(selected.name);
    if (!storedTeam) localStorage.setItem(STORAGE_KEY, selected.id);
  }, [teams, teamsQuery.isLoading]);

  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === STORAGE_KEY) {
        teamsQuery.refetch();
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [teamsQuery.refetch]);

  const loading = teamsQuery.isLoading || (teams.length > 0 && memberQueries.some((q) => q.isLoading));

  const loadTeams = useCallback(() => {
    return Promise.all([
      teamsQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["team-members"] }),
    ]);
  }, [teamsQuery.refetch, queryClient]);

  function setWorkspace(id, name) {
    setWorkspaceIdState(id);
    setWorkspaceName(name);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function canManageTeam(teamId, userId) {
    if (!teamId || !userId) return false;
    const role = getUserRole(teamId, userId);
    return role === "MANAGER";
  }

  function getUserRole(teamId, userId) {
    if (!teamId || !userId) return null;
    const members = teamMembersMap[teamId] || [];
    const member = members.find((m) => m.userId === userId);
    return member?.role || null;
  }

  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspaceName, teams, teamMembersMap, loading, setWorkspace, loadTeams, canManageTeam, getUserRole }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
