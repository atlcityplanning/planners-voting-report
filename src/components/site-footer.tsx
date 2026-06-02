export default function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-8 text-sm text-muted-foreground print:hidden">
      <div className="mx-auto w-[min(1180px,calc(100%-2rem))]">
        <p className="m-0">
          Built and maintained by the{" "}
          <a
            href="https://www.atlantaga.gov/government/departments/city-planning"
            className="font-semibold text-primary underline decoration-primary/25 underline-offset-4 transition-colors hover:text-primary/80"
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
