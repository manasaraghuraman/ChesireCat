/**
 * File: app/page.tsx
 * Purpose: Title screen with link to the game.
 * Author: manasa
 * Date: 2026-11-21
 */
import Link from "next/link";

export default function TitlePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-5xl font-bold">Down the Rabbit Hole</h1>
      <p className="max-w-md text-lg">
        Wonderland is the internet. Nothing is what it seems. Find the Golden Key and reach the garden.
      </p>
      <Link href="/play" className="rounded bg-amber-400 px-6 py-3 font-bold text-purple-950">
        Begin
      </Link>
    </main>
  );
}
