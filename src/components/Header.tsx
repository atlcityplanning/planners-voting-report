import { Link } from "@tanstack/react-router";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur print:hidden">
      <nav className="mx-auto flex min-h-16 w-[min(1180px,calc(100%-2rem))] flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:gap-6 sm:py-0">
        <Link to="/" className="text-sm font-extrabold tracking-tight text-slate-950 no-underline">
          NPU Voting Report
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500">
          <Link
            to="/"
            className="text-slate-500 no-underline transition-colors hover:text-slate-950"
            activeProps={{
              className: "text-slate-950 no-underline transition-colors",
            }}
          >
            Report
          </Link>
          <a
            href="https://www.atlantaga.gov/government/departments/city-planning"
            className="text-slate-500 no-underline transition-colors hover:text-slate-950"
            target="_blank"
            rel="noreferrer"
          >
            DCP
          </a>
          <a
            href="https://www.atlantaga.gov/government/departments/city-planning/neighborhood-planning-units/updates"
            className="text-slate-500 no-underline transition-colors hover:text-slate-950"
            target="_blank"
            rel="noreferrer"
          >
            Updates
          </a>
        </div>
      </nav>
    </header>
  );
}
