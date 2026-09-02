import { createClient } from '@/lib/supabase-server'
import TransactionsClient from './TransactionsClient'
import { getTodayString } from '@/lib/dateUtils'

const PAGE_SIZE = 100
const EXPORT_LIMIT = 5000

export default async function TransactionsPage({ searchParams }) {
  const { dateFrom, dateTo, page: pageParam } = await searchParams ?? {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = getTodayString()

  const from = dateFrom || today
  const to = dateTo || today
  const page = Math.max(1, Number(pageParam) || 1)
  const rangeFrom = (page - 1) * PAGE_SIZE
  const rangeTo = rangeFrom + PAGE_SIZE - 1

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  // ตารางแสดงผล — ใช้ .range() pagination จริง ไม่มีทางถูกตัดแถวเงียบๆ ไม่ว่า Max Rows ระดับโปรเจกต์จะตั้งไว้เท่าไหร่
  let txPageQuery = supabase
    .from('transactions')
    .select('*, bookings(room_id, rooms(room_no))', { count: 'exact' })
    .gte('tx_date', from)
    .lte('tx_date', to)
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)
  if (!isAdmin) txPageQuery = txPageQuery.eq('created_by', user.id)

  // สำหรับ Export + ยอดที่กรองด้วย checkbox ประเภท/หมวดหมู่ (ต้องเห็นทั้งช่วงวันที่ ไม่ใช่แค่หน้าปัจจุบัน)
  let txExportQuery = supabase
    .from('transactions')
    .select('*, bookings(room_id, rooms(room_no))')
    .gte('tx_date', from)
    .lte('tx_date', to)
    .order('created_at', { ascending: false })
    .limit(EXPORT_LIMIT)
  if (!isAdmin) txExportQuery = txExportQuery.eq('created_by', user.id)

  let todayQuery = supabase.from('transactions').select('tx_type, amount').eq('tx_date', today)
  if (!isAdmin) todayQuery = todayQuery.eq('created_by', user.id)

  const [
    { data: transactions, count: totalCount },
    { data: exportTransactions },
    { data: todayRows },
    { data: saleItems },
    { data: categories },
    { data: totalsRpc },
  ] = await Promise.all([
    txPageQuery,
    txExportQuery,
    todayQuery,
    supabase
      .from('inventory_items')
      .select('id, name, unit, current_stock, sale_price')
      .eq('is_for_sale', true)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('transaction_categories')
      .select('id, tx_type, name, sort_order')
      .eq('is_active', true)
      .order('tx_type', { ascending: true })
      .order('sort_order', { ascending: true }),
    // ยอดรวมทั้งช่วงวันที่ — คำนวณฝั่ง DB เสมอ ไม่ผูกกับการตัดแถวของฝั่ง client
    supabase.rpc('get_transaction_totals', {
      p_from: from,
      p_to: to,
      p_created_by: isAdmin ? null : user.id,
    }),
  ])

  const totalsRow = Array.isArray(totalsRpc) ? totalsRpc[0] : totalsRpc
  const rangeTotals = {
    records: Number(totalsRow?.records ?? 0),
    income: Number(totalsRow?.income ?? 0),
    expense: Number(totalsRow?.expense ?? 0),
    net: Number(totalsRow?.net ?? 0),
  }

  const cats = categories ?? []
  const incomeCategories = cats.filter(c => c.tx_type === 'income').map(c => c.name)
  const expenseCategories = cats.filter(c => c.tx_type === 'expense').map(c => c.name)

  // Usage counts (admin only, used to warn before deleting a category still in use)
  let categoryUsage = {}
  if (isAdmin) {
    const { data: usageRows } = await supabase.from('v_category_usage').select('category, records')
    ;(usageRows ?? []).forEach(r => {
      if (r.category) categoryUsage[r.category] = (categoryUsage[r.category] || 0) + Number(r.records)
    })
  }

  const mapRoom = t => ({ ...t, room_no: t.bookings?.rooms?.room_no ?? null })
  const txs = (transactions ?? []).map(mapRoom)
  const exportTxs = (exportTransactions ?? []).map(mapRoom)

  const todayIncome = (todayRows ?? []).filter(t => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const todayExpense = (todayRows ?? []).filter(t => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE))

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">รายรับ-รายจ่าย</h1>
        <p className="text-sm text-gray-500 mt-0.5">บันทึกและดูรายรับ-รายจ่ายประจำวัน</p>
      </div>
      <TransactionsClient
        transactions={txs}
        exportTransactions={exportTxs}
        exportLimitReached={exportTxs.length === EXPORT_LIMIT}
        rangeTotals={rangeTotals}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount ?? 0}
        today={today}
        from={from}
        to={to}
        todayIncome={todayIncome}
        todayExpense={todayExpense}
        saleItems={saleItems ?? []}
        isAdmin={isAdmin}
        categories={cats}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        categoryUsage={categoryUsage}
      />
    </div>
  )
}
