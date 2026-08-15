export default function LoadingSkeleton({ rows = 3, className = "" }) {
  return (
    <div className={"space-y-2 animate-pulse " + className}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark"
        />
      ))}
    </div>
  );
}
