"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function VistaClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [path, router]);

  return <>{children}</>;
}
