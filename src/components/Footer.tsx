export default function Footer() {
  return (
    <footer className="border-t border-slate-200 px-4 py-8 text-sm text-slate-500 print:hidden">
      <div className="mx-auto w-[min(1180px,calc(100%-2rem))]">
        <p className="m-0">
          Prepared by the{" "}
          <a
            href="https://www.atlantaga.gov/government/departments/city-planning"
            className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-800"
            target="_blank"
            rel="noreferrer"
          >
            Department of City Planning
          </a>
          , City of Atlanta.
        </p>
      </div>
    </footer>
  );
}
