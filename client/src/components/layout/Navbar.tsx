"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { TesseraLogo } from "./TesseraLogo";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
];

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", y => setScrolled(y > 60));

  return (
    /* Outer wrapper: always full-width, centers the pill when scrolled */
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
      <motion.header
        /* Framer handles the shape morph */
        animate={{
          borderRadius: scrolled ? 100 : 0,
          maxWidth: scrolled ? 740 : 9999,
          marginTop: scrolled ? 16 : 0,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="w-full pointer-events-auto relative overflow-hidden"
      >
        {/* Background layer — CSS transition for blur/color so it's separate from shape */}
        <div
          className={cn(
            "absolute inset-0 transition-all duration-300",
            scrolled
              ? "bg-bg/85 backdrop-blur-2xl border border-border shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
              : "bg-transparent border-b border-border/30",
          )}
        />

        {/* Content */}
        <div
          className={cn(
            "relative z-10 flex items-center gap-6 transition-[padding] duration-300",
            scrolled ? "px-5 py-2.5" : "px-8 py-4",
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mr-auto">
            <TesseraLogo className="w-6 h-6 text-accent" />
            <span className="font-display font-semibold tracking-tight text-foreground">
              Tessera
            </span>
          </Link>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted hover:text-foreground transition-colors duration-200"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/chat">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="text-sm font-medium bg-accent text-bg px-4 py-2 rounded-full
                           hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
              >
                Launch app
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.header>
    </div>
  );
}
