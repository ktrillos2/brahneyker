import { Suspense } from "react"
import { getDailyOperations, getDailyProductSales } from "@/app/actions/daily-operations"
import { db } from "@/lib/db"
import { products } from "@/lib/schema"
import { DailyOperations } from "@/components/admin/daily-operations"
import { format } from "date-fns"

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function DailyInvoicesPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const date = typeof searchParams.date === 'string' ? searchParams.date : format(new Date(), 'yyyy-MM-dd')

    // Fetch data in parallel
    const [operations, productSales, allProducts] = await Promise.all([
        getDailyOperations(date),
        getDailyProductSales(date),
        db.select().from(products),
    ])

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <DailyOperations
                date={date}
                operations={operations}
                productSales={productSales}
                products={allProducts}
            />
        </div>
    )
}
