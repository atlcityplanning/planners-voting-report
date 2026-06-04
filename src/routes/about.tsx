import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="mx-auto w-[min(780px,calc(100%-2rem))] py-10">
      <section className="rounded-2xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-border sm:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">About</p>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          NPU Planner&apos;s Voting Report
        </h1>
        <p className="mb-0 mt-4 leading-7">
          This application allows planners to manage NPU agenda items, record voting recommendations, and generate print-ready official reports for the Department of City Planning.
        </p>
      </section>
    </main>
  )
}
