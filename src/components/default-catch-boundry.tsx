import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error('DefaultCatchBoundary Error:', error)

  return (
    <div className="m-auto mt-16 flex w-[min(42rem,calc(100%-2rem))] flex-col items-center justify-center border-2 border-destructive bg-destructive/10 p-8 text-center shadow-[8px_8px_0_0_hsl(var(--destructive))] rounded-none">
      <AlertOctagon className="mb-4 h-16 w-16 text-destructive" strokeWidth={1.5} />
      <h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-destructive">
        Something Went Wrong
      </h1>
      <div className="mb-8 w-full overflow-auto border-2 border-destructive/20 bg-background/50 p-4 text-left font-medium text-destructive rounded-none">
        <ErrorComponent error={error} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          variant="destructive"
          className="h-11 rounded-none border-2 border-transparent px-6 font-bold uppercase tracking-wider"
          onClick={() => {
            router.invalidate()
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        {isRoot ? (
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-none border-2 border-destructive px-6 font-bold uppercase tracking-wider text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-none border-2 border-destructive px-6 font-bold uppercase tracking-wider text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Link
              to="/"
              onClick={(e) => {
                e.preventDefault()
                window.history.back()
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Go Back
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}