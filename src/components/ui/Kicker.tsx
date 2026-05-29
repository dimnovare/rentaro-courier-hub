export function Kicker({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={`kicker ${muted ? "muted" : ""}`}>
      <span className="bar" />
      {children}
    </div>
  );
}
