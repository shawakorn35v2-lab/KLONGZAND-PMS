import { createClient } from '@/lib/supabase-server'
import TransactionsClient from './TransactionsClient'
import { getTodayString } from '@/lib/dateUtils'

export default async function TransactionsPage({ searchParams }) {
  const { dateFrom, dateTo } = await searchParams ?? {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = getTodayString()

  const from = dateFrom || today
  const to = dateTo || today

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  let txQuery = supabase
    .from('transactions')
    .select('*, bookings(room_id, rooms(room_no))')
    .gte('tx_date', from)
    .lte('tx_date', to)
    .order('created_at', { ascending: false })
  if (!isAdmin) txQuery = txQuery.eq('created_by', user.id)

  const [
    { data: transactions },
    { data: saleItems },
    { data: categories },
  ] = await Promise.all([
    txQuery,
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
  ])

  const cats = categories ?? []
  const incomeCategories = cats.filter(c => c.tx_type === 'income').map(c => c.name)
  const expenseCategories = cats.filter(c => c.tx_type === 'expense').map(c => c.name)

  // Usage counts (admin only, used to warn before deleting a category still in use)
  let categoryUsage = {}
  if (isAdmin) {
    const { data: allCats } = await supabase.from('transactions').select('category')
    ;(allCats ?? []).forEach(r => {
      if (r.category) categoryUsage[r.category] = (categoryUsage[r.category] || 0) + 1
    })
  }

  const txs = (transactions ?? []).map(t => ({
    ...t,
    room_no: t.bookings?.rooms?.room_no ?? null,
  }))
  const todayTxs = txs.filter(t => t.tx_date === today)
  const todayIncome = todayTxs.filter(t => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const todayExpense = todayTxs.filter(t => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">รายรับ-รายจ่าย</h1>
        <p className="text-sm text-gray-500 mt-0.5">บันทึกและดูรายรับ-รายจ่ายประจำวัน</p>
      </div>
      <TransactionsClient
        transactions={txs}
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
