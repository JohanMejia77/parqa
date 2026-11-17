import Link from "next/link";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { RUTA_INICIO, type Usuario } from "@/modelos";

/** Se muestra cuando alguien abre la dirección de una página que no corresponde a su rol. */
export function SinPermiso({ usuario }: { usuario: Usuario }) {
  const esAdministrador = usuario.rol === "ADMINISTRADOR";

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockIcon />
        </EmptyMedia>
        <EmptyTitle>Tu cuenta no tiene permiso para esta página</EmptyTitle>
        <EmptyDescription>
          {esAdministrador
            ? "Iniciaste sesión como administrador: gestionas los usuarios y las celdas. Las entradas y salidas las registra un operador."
            : "Iniciaste sesión como operador: registras entradas y salidas. Los usuarios y las celdas los gestiona un administrador."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href={RUTA_INICIO[usuario.rol]} />} nativeButton={false}>
          {esAdministrador ? "Ir a Celdas" : "Ir al Panel"}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
