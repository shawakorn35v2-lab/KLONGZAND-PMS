import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getReceipts } from '@/app/actions/receipts'
import ReceiptsClient from './ReceiptsClient'

export default async function ReceiptsPage({ searchParams }) {
  const sp = (await searchParams) ?? {}
  const search = String(sp.search ?? '')
  const currentPage = Math.max(1, Number(sp.page) || 1)
  const limit = 20

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  const { data: receipts, count } = await getReceipts({ page: currentPage, limit, search })

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">ออกบิล / ใบเสร็จรับเงิน</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            รายการใบเสร็จรับเงินทั้งหมด ({(count ?? 0).toLocaleString('th-TH')} ใบ)
          </p>
        </div>
        <Link href="/receipts/new" className="btn-primary">+ สร้างใบเสร็จใหม่</Link>
      </div>

      <ReceiptsClient
        receipts={receipts}
        total={count}
        page={currentPage}
        limit={limit}
        search={search}
        isAdmin={isAdmin}
      />
    </div>
  )
}
