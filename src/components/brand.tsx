import Image from "next/image";

/** A bounded box preserves any logo's proportions, including CMS uploads. */
export function Brand({
  src,
  alt = "LEA Aesthetic",
  name = "LEA Aesthetic",
  location = "Istanbul, Turquie",
  caption = true,
  priority = false,
}: {
  src: string;
  alt?: string;
  name?: string;
  location?: string;
  caption?: boolean;
  priority?: boolean;
}) {
  return (
    <span
      className={`brand-signature ${caption ? "" : "brand-signature-image-only"}`}
    >
      <span className="brand-symbol">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={caption ? "(max-width: 980px) 60px, 72px" : "280px"}
          className="brand-image"
          style={{ objectFit: "contain" }}
          unoptimized={src.startsWith("/media/")}
          priority={priority}
        />
      </span>
      {caption && (
        <span className="brand-caption">
          <strong>{name.replace(/^LEA\s+/i, "")}</strong>
          <small>{location}</small>
        </span>
      )}
    </span>
  );
}
