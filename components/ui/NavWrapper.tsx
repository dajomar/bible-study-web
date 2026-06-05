"use client";

import { usePathname } from "next/navigation";
import Nav from "./Nav";

const RUTAS_SIN_NAV = ["/login"];

export default function NavWrapper() {
  const pathname = usePathname();
  if (RUTAS_SIN_NAV.includes(pathname)) return null;
  return <Nav />;
}
