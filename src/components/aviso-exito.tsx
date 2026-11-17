import { CircleCheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Confirmación de que una operación quedó guardada. Permanece en pantalla hasta la
 * siguiente operación y se anuncia a los lectores de pantalla sin interrumpir (role="status").
 */
export function AvisoExito({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Alert role="status" className="aparece border-exito/40 bg-exito/5">
      <CircleCheckIcon className="text-exito" />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
