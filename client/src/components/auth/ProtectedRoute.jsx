import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import LoadingSkeleton from "../ui/LoadingSkeleton";

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="w-full max-w-md space-y-6 p-8">
          <LoadingSkeleton className="h-10 w-48" />
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-3/4" />
          <LoadingSkeleton className="h-32 w-full" />
          <LoadingSkeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
