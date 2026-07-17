import { NextResponse } from "next/server";

/**
 * DESACTIVADA. Creava clients a partir dels noms del full de Google.
 *
 * Els clients ara viuen a la taula Cliente i es donen d'alta des del panell, que canonicalitza el nom.
 * Això no ho feia: comparava els noms tal qual i hauria tornat a crear un "VINSEUM" al costat del
 * "Vinseum", que és exactament el duplicat que vam haver d'arreglar.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Esta sincronización está desactivada: los clientes se crean desde el Panel de clientes, que evita duplicados por mayúsculas o acentos.",
    },
    { status: 410 }
  );
}
