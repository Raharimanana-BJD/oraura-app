import dashboardData from "@/app/dashboard/data.json"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, schema } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"

const orders = schema.array().parse(dashboardData)

export function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 bg-gradient-to-b from-background via-background to-muted/20 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <div className="px-4 lg:px-6">
        <DataTable data={orders} />
      </div>
    </div>
  )
}
