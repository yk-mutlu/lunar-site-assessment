import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold tracking-wider mb-2">404</h1>
      <p className="text-slate-400 mb-6 text-sm">Target trajectory lost or lunar coordinate not found.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-medium uppercase tracking-wider transition-colors"
      >
        Return to Mission Control
      </Link>
    </div>
  );
}
