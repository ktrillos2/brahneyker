import { addDays, format, parseISO, startOfWeek } from "date-fns"
import { asc } from "drizzle-orm"

import { getDailyOperations, getDailyProductSales, getWeeklyRecords } from "@/app/actions/daily-operations"
import { IncomeDay } from "@/components/admin/income-day"
import { IncomeWeek } from "@/components/admin/income-week"
import { IncomeHeader } from "@/components/admin/income-header"
import { db } from "@/lib/db"
import { todayInBogota } from "@/lib/dates"
import { listEmployees } from "@/lib/employees"
import { products } from "@/lib/schema"

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Active employees in their order, plus any inactive one who has records in the period.
function columnsFor(employees: { name: string; active: boolean }[], namesWithRecords: string[]) {
    const columns = employees.filter((e) => e.active).map((e) => e.name)
    for (const name of namesWithRecords) {
        if (!columns.includes(name)) columns.push(name)
    }
    return columns
}

export default async function IngresosPage(props: PageProps) {
    const searchParams = await props.searchParams
    const view = searchParams.view === 'semana' ? 'semana' : 'dia'
    const date = typeof searchParams.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
        ? searchParams.date
        : todayInBogota()

    const employees = await listEmployees()

    if (view === 'semana') {
        const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')
        const records = await getWeeklyRecords(weekStart, weekEnd)
        const columns = columnsFor(employees, records.operations.map((op) => op.stylist))

        return (
            <div className="h-full flex-1 flex-col space-y-6 p-4 md:p-8 md:flex">
                <IncomeHeader view={view} date={date} />
                <IncomeWeek weekStart={weekStart} columns={columns} records={records} />
            </div>
        )
    }

    const [operations, productSales, productList] = await Promise.all([
        getDailyOperations(date),
        getDailyProductSales(date),
        db.select({ id: products.id, name: products.name, price: products.price, quantity: products.quantity })
            .from(products)
            .orderBy(asc(products.name)),
    ])
    const columns = columnsFor(employees, operations.map((op) => op.stylist))

    return (
        <div className="h-full flex-1 flex-col space-y-6 p-4 md:p-8 md:flex">
            <IncomeHeader view={view} date={date} />
            <IncomeDay
                date={date}
                columns={columns}
                operations={operations}
                productSales={productSales}
                products={productList}
            />
        </div>
    )
}
