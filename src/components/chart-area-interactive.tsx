"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2026-03-16", desktop: 42, mobile: 28 },
  { date: "2026-03-17", desktop: 48, mobile: 34 },
  { date: "2026-03-18", desktop: 45, mobile: 31 },
  { date: "2026-03-19", desktop: 56, mobile: 37 },
  { date: "2026-03-20", desktop: 63, mobile: 44 },
  { date: "2026-03-21", desktop: 59, mobile: 40 },
  { date: "2026-03-22", desktop: 61, mobile: 39 },
  { date: "2026-03-23", desktop: 67, mobile: 46 },
  { date: "2026-03-24", desktop: 72, mobile: 48 },
  { date: "2026-03-25", desktop: 69, mobile: 45 },
  { date: "2026-03-26", desktop: 74, mobile: 51 },
  { date: "2026-03-27", desktop: 78, mobile: 54 },
  { date: "2026-03-28", desktop: 82, mobile: 57 },
  { date: "2026-03-29", desktop: 76, mobile: 50 },
  { date: "2026-03-30", desktop: 81, mobile: 53 },
  { date: "2026-03-31", desktop: 84, mobile: 56 },
  { date: "2026-04-01", desktop: 88, mobile: 62 },
  { date: "2026-04-02", desktop: 91, mobile: 66 },
  { date: "2026-04-03", desktop: 94, mobile: 69 },
  { date: "2026-04-04", desktop: 97, mobile: 71 },
  { date: "2026-04-05", desktop: 102, mobile: 76 },
  { date: "2026-04-06", desktop: 108, mobile: 81 },
  { date: "2026-04-07", desktop: 112, mobile: 85 },
]

const chartConfig = {
  visitors: {
    label: "Flux",
  },
  desktop: {
    label: "Commandes encaissees",
    color: "var(--primary)",
  },
  mobile: {
    label: "Tickets cuisine",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-04-07")
    let daysToSubtract = 90

    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }

    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)

    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Commandes et impression cuisine</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Vision glissante des deux flux critiques du service
          </span>
          <span className="@[540px]/card:hidden">Vue glissante</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">90 jours</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 jours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 jours</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Choisir une periode"
            >
              <SelectValue placeholder="90 jours" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                90 jours
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 jours
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 jours
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={1}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)

                return date.toLocaleDateString("fr-FR", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("fr-FR", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
