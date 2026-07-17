import { NextResponse } from "next/server";

/**
 * DESACTIVADA. Ponía "cliente123" a TODOS los clientes de golpe.
 *
 * Ahora cada cliente tiene su propia contraseña y esto se las borraría todas. Se hizo para apagar el
 * fuego de unos hashes de crypt() de PostgreSQL que bcryptjs no sabía leer; ya no queda ninguno: los
 * 19 usuarios tienen bcrypt.
 *
 * Para cambiar la contraseña de un cliente concreto: pantalla de Usuarios.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Esto está desactivado: pondría la misma contraseña a todos los clientes y borraría la de cada uno. Para cambiar la de un cliente, hazlo desde Usuarios.",
    },
    { status: 410 }
  );
}
