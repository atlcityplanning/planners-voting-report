import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="mx-auto w-[min(780px,calc(100%-2rem))] py-10">
      <section className="rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200 sm:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          About
        </p>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Planner&apos;s Voting Report
        </h1>
        <p className="mb-0 mt-4 leading-7">
          This TanStack Start app replaces the legacy static voting form with a
          typed React workflow for NPU agenda items, recommendations, local
          persistence, and print-ready reports.
        </p>
      </section>
    </main>
  )
}
