import { NextResponse } from "next/server";

/**
 * DESACTIVADA. Importaba el full de Google a la taula Venta.
 *
 * Des que la base de dades és la font de les vendes (l'Alexandra les entra a "Datos mensuales"),
 * executar això sobreescriuria les dades bones amb les del full, que ja no s'actualitza. A més, mai no
 * va tenir clau única ni dedupe: executar-la sis vegades va deixar sis còpies de cada venda i un total
 * inflat de 437.299 entrades quan de veritat eren unes 76.000.
 *
 * La lectura del full segueix disponible (/api/sheets/data, /api/sheets/stats) i el comparador
 * `npm run comparar` enfronta les dues fonts quan calgui. Per tornar a portar dades del full a la base
 * de dades hi ha `npm run migrar:ventas`, que sí que és idempotent.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Esta sincronización está desactivada: las ventas ahora viven en la base de datos y esto las sobrescribiría con la hoja antigua. Para importar desde los Excels usa `npm run migrar:ventas`.",
    },
    { status: 410 }
  );
}
