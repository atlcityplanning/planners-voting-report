import { Link } from '@tanstack/react-router'
import { FileQuestion, RotateCcw, Home } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="m-auto mt-16 flex w-[min(36rem,calc(100%-2rem))] flex-col items-center justify-center border-2 border-border bg-popover p-8 text-center shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-none">
      <FileQuestion className="mb-4 h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
      <h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-foreground">
        Page Not Found
      </h1>
      <div className="mb-8 font-medium text-muted-foreground">
        {children || <p>The page you are looking for does not exist or has been moved.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          variant="outline"
          className="h-11 rounded-none border-2 border-border px-6 font-bold uppercase tracking-wider"
          onClick={() => window.history.back()}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        <Button
          asChild
          className="h-11 rounded-none border-2 border-primary px-6 font-bold uppercase tracking-wider"
        >
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Start Over
          </Link>
        </Button>
      </div>
    </div>
  )
}