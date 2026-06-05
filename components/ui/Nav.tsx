"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import apiClient from "@/lib/axios";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/estudio", label: "Estudio" },
  { href: "/biblia", label: "Biblia" },
  { href: "/analisis", label: "Análisis" },
  { href: "/resaltados", label: "Resaltados" },
  { href: "/plan", label: "Plan" },
  { href: "/configuracion", label: "Config" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  async function handleLogout() {
    setAbierto(false);
    await apiClient.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-[#E8E4DF] bg-white sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <span className="font-lora text-lg text-[#2C2C2C]">Estudio Bíblico</span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`font-inter text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "bg-[#FAF8F5] text-[#4A6FA5] font-medium"
                    : "text-[#8A8A8A] hover:text-[#2C2C2C]"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="font-inter text-sm text-[#8A8A8A] hover:text-[#2C2C2C] px-3 py-1.5 ml-2 transition-colors"
          >
            Salir
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setAbierto((v) => !v)}
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
          aria-label="Menú"
        >
          <span className={`block w-5 h-0.5 bg-[#2C2C2C] transition-all ${abierto ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-0.5 bg-[#2C2C2C] transition-all ${abierto ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-[#2C2C2C] transition-all ${abierto ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {abierto && (
        <div className="md:hidden border-t border-[#E8E4DF] bg-white px-4 py-3">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAbierto(false)}
                className={`flex items-center font-inter text-sm px-3 py-3 rounded-lg transition-colors ${
                  active
                    ? "text-[#4A6FA5] font-medium bg-[#FAF8F5]"
                    : "text-[#2C2C2C] hover:bg-[#FAF8F5]"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full text-left font-inter text-sm text-[#8A8A8A] px-3 py-3 hover:bg-[#FAF8F5] rounded-lg transition-colors mt-1 border-t border-[#E8E4DF] pt-3"
          >
            Salir
          </button>
        </div>
      )}
    </nav>
  );
}
