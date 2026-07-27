import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/browse" className="font-semibold text-zinc-900 dark:text-zinc-100">
            Studio
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/browse">Portfolio</Link>
            <Link href="/browse#contact">Contact</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        &copy; {new Date().getFullYear()} Studio. All rights reserved.
      </footer>
    </div>
  );
}
