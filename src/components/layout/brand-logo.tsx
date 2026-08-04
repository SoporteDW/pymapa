import logoAsset from "@/assets/pymapa-logo.png.asset.json";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /** Oculta la insignia MVP Alfa */
  sinBadge?: boolean;
}

/**
 * Marca pymapa. El logotipo incluye el isotipo y el wordmark, por lo que se
 * usa como imagen única para conservar las proporciones originales.
 */
export function BrandLogo({ className, sinBadge = false }: BrandLogoProps) {
  return (
    <span className="flex items-center gap-2">
      <img
        src={logoAsset.url}
        alt="pymapa"
        className={cn("h-7 w-auto sm:h-8", className)}
        width={160}
        height={32}
      />
      {!sinBadge && (
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-primary">
          MVP Alfa
        </span>
      )}
    </span>
  );
}
