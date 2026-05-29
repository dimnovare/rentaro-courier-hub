export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <span
      className="logo"
      style={{ width: size, height: size, backgroundImage: "url(/assets/logo-r.png)" }}
      aria-label="rentaro"
    />
  );
}
