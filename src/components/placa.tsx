import { cn } from "@/lib/utils";

const TAMANOS = {
  sm: "h-6 px-1.5 text-[0.95rem]",
  md: "h-8 px-2 text-lg",
  lg: "h-12 px-3.5 text-3xl",
};

/** Placa con el aspecto de una placa colombiana: fondo amarillo y letras negras. */
export function Placa({
  placa,
  tamano = "sm",
  className,
}: {
  placa: string;
  tamano?: keyof typeof TAMANOS;
  className?: string;
}) {
  return (
    <span
      translate="no"
      className={cn(
        "inline-flex shrink-0 items-center rounded-[5px] border-[1.5px] border-placa-foreground bg-placa font-placa leading-none font-semibold tracking-[0.06em] whitespace-nowrap text-placa-foreground uppercase",
        TAMANOS[tamano],
        className
      )}
    >
      {placa.slice(0, 3)}&nbsp;{placa.slice(3)}
    </span>
  );
}
