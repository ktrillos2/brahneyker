import { Suspense } from "react"
import { getDailyOperations, getDailyProductSales, getWeeklyRecords } from "@/app/actions/daily-operations"
import { db } from "@/lib/db"
import { products } from "@/lib/schema"
import { DailyOperations } from "@/components/admin/daily-operations"
import { getActiveEmployeeNames } from "@/lib/employees"
import { todayInBogota } from "@/lib/dates"
import { addDays, format, parseISO, startOfWeek } from "date-fns"

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function DailyInvoicesPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const date = typeof searchParams.date === 'string' ? searchParams.date : todayInBogota()

    // Week of the selected date (Monday to Sunday)
    const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')

    // Fetch data in parallel
    const [operations, productSales, allProducts, weeklyRecords, stylists] = await Promise.all([
        getDailyOperations(date),
        getDailyProductSales(date),
        db.select().from(products),
        getWeeklyRecords(weekStart, weekEnd),
        getActiveEmployeeNames(),
    ])

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <DailyOperations
                date={date}
                operations={operations}
                productSales={productSales}
                products={allProducts}
                weekStart={weekStart}
                weeklyRecords={weeklyRecords}
                stylists={stylists}
            />
        </div>
    )
}
