export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <span
      className="logo"
      style={{
        width: size,
        height: size,
        // Keep the mark self-contained: declare full background sizing inline so
        // the lime "R" renders the same in every context. The source PNG is
        // 180×180 with a baked-in dark background, so without an explicit
        // background-size it defaults to `auto` and the tiny box only shows the
        // empty top-left corner of the art (this is why it was a blank square in
        // the admin sidebar/sign-in, where the parent selector supplies no
        // sizing). The public `.brand .logo` rule already used 72% center; we
        // replicate it here so that lockup stays pixel-identical.
        backgroundImage: "url(/assets/logo-r.png)",
        backgroundPosition: "center",
        backgroundSize: "72%",
        backgroundRepeat: "no-repeat",
      }}
      aria-label="rentaro"
    />
  );
}
