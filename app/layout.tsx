/**
 * File: app/layout.tsx
 * Purpose: Root layout for the game site.
 * Author: manasa
 * Date: 2026-11-21
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Down the Rabbit Hole",
  description: "An online-safety game: see through every trick to reach the garden.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
