import { ArrowRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function RoutePlaceholderPage({
  eyebrow,
  title,
  description,
  highlights,
}: {
  eyebrow: string
  title: string
  description: string
  highlights: string[]
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 lg:px-6">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/12 via-background to-background shadow-sm">
        <CardHeader className="gap-3">
          <Badge variant="outline" className="w-fit">
            {eyebrow}
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
          <CardDescription className="max-w-2xl text-sm sm:text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {highlights.map((highlight) => (
            <div
              key={highlight}
              className="rounded-xl border bg-background/80 p-4 text-sm text-muted-foreground shadow-xs"
            >
              {highlight}
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-sm text-muted-foreground">
            Structure prete pour brancher la logique metier.
          </span>
          <Button variant="outline" size="sm">
            Continuer
            <ArrowRightIcon />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
