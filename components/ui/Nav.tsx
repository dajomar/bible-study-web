"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import apiClient from "@/lib/axios";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/estudio", label: "Estudio" },
  { href: "/biblia", label: "Biblia" },
  { href: "/analisis", label: "Análisis" },
  { href: "/plan", label: "Plan" },
  { href: "/configuracion", label: "Config" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiClient.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-[#E8E4DF] bg-white">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="font-lora text-lg text-[#2C2C2C]">Estudio Bíblico</span>

        <div className="flex items-center gap-1">
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
      </div>
    </nav>
  );
}
