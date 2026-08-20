import { useEffect, useRef } from "react";

export function useOnWorkspaceChange(workspaceId, onChange) {
  const prevRef = useRef(workspaceId);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (prevRef.current !== workspaceId) {
      prevRef.current = workspaceId;
      onChangeRef.current?.();
    }
  }, [workspaceId]);
}
