import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MESES = [
  "01. Enero", "02. Febrero", "03. Marzo", "04. Abril", "05. Mayo", "06. Junio",
  "07. Julio", "08. Agosto", "09. Septiembre", "10. Octubre", "11. Noviembre", "12. Diciembre",
];
const OTAS = ["Tiqets", "GetYourGuide", "Viator", "Musement"];
const TIPOS = ["General", "Niño", "Reducido"];
const PRODUCTOS = ["40 Minutos", "60 Minutos", "90 Minutos"];

async function main() {
  await prisma.venta.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cliente.deleteMany();

  const golondrinas = await prisma.cliente.create({ data: { nombre: "Golondrinas" } });
  const mapfre = await prisma.cliente.create({ data: { nombre: "MAPFRE" } });
  const clientes = [golondrinas, mapfre];

  const hashedAdmin = await bcrypt.hash("admin123", 10);
  const hashedClient = await bcrypt.hash("client123", 10);

  await prisma.user.create({
    data: {
      email: "admin@ota.com",
      password: hashedAdmin,
      role: "admin",
    },
  });

  await prisma.user.create({
    data: {
      email: "golondrinas@ota.com",
      password: hashedClient,
      role: "client",
      clienteId: golondrinas.id,
    },
  });

  for (const cliente of clientes) {
    for (const anio of [2023, 2024]) {
      for (const mes of MESES) {
        for (const ota of OTAS) {
          for (const tipo of TIPOS) {
            const producto = PRODUCTOS[Math.floor(Math.random() * PRODUCTOS.length)];
            const numeroEntradas = Math.floor(Math.random() * 500) + 50;
            await prisma.venta.create({
              data: {
                clienteId: cliente.id,
                ota,
                tipoEntrada: tipo,
                mes,
                anio,
                numeroEntradas,
                producto,
              },
            });
          }
        }
      }
    }
  }

  console.log("Seed completado. Usuarios:");
  console.log("  admin@ota.com / admin123 (admin)");
  console.log("  golondrinas@ota.com / client123 (cliente Golondrinas)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
