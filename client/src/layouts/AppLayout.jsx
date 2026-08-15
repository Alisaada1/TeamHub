import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import CommandPalette from "../components/layout/CommandPalette";
import ToastContainer from "../components/ui/ToastContainer";
import { WorkspaceProvider } from "../context/WorkspaceContext";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const commandOpenRef = useRef(commandOpen);
  commandOpenRef.current = commandOpen;

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (e.key === "Escape" && commandOpenRef.current) {
        setCommandOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <WorkspaceProvider>
      <div className="flex h-screen bg-bg-light dark:bg-bg-dark">
        <ToastContainer />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} onSearchClick={() => setCommandOpen(true)} />
          <main className="flex-1 overflow-y-auto scrollbar-thin p-3 sm:p-4 lg:p-5">
            <Outlet />
          </main>
        </div>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      </div>
    </WorkspaceProvider>
  );
}
