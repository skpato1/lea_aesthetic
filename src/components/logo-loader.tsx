import Image from "next/image";

export function LogoLoader({
  logo = "/images/lea-logo-rose.webp",
  active = true,
  label = "Chargement des visuels",
  loaded = 0,
  total = 0,
}: {
  logo?: string;
  active?: boolean;
  label?: string;
  loaded?: number;
  total?: number;
}) {
  const progress = total > 0 ? Math.round((loaded / total) * 100) : 12;

  return (
    <div
      className={`site-loader${active ? " is-active" : ""}`}
      data-site-loader
      data-state={active ? "visible" : "hidden"}
      role={active ? "status" : undefined}
      aria-live="polite"
      aria-hidden={!active}
    >
      <div className="site-loader-panel">
        <div className="site-loader-mark" aria-hidden="true">
          <span className="site-loader-orbit" />
          <Image
            src={logo}
            alt=""
            width={112}
            height={112}
            sizes="112px"
            priority
            unoptimized={logo.startsWith("/media/")}
            data-site-loader-image
          />
        </div>
        <strong>LEA Aesthetic</strong>
        <span className="site-loader-label">{label}</span>
        <span className="site-loader-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
      </div>
    </div>
  );
}
