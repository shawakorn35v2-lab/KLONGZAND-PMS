import { createClient } from '@/lib/supabase-server'
import TransactionsClient from './TransactionsClient'
import { getTodayString } from '@/lib/dateUtils'

export default async function TransactionsPage({ searchParams }) {
  const { dateFrom, dateTo } = await searchParams ?? {}
  const supabase = await createClient()
  const today = getTodayString()

  const from = dateFrom || today
  const to = dateTo || today

  const [
    { data: transactions },
    { data: todayClosed },
    { data: allClosings },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .gte('tx_date', from)
      .lte('tx_date', to)
      .order('created_at', { ascending: false }),
    supabase
      .from('daily_closings')
      .select('id')
      .eq('closing_date', today)
      .single(),
    supabase
      .from('daily_closings')
      .select('closing_date')
      .order('closing_date', { ascending: false })
      .limit(30),
  ])

  const txs = transactions ?? []
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
        alreadyClosed={!!todayClosed}
        closedDates={(allClosings ?? []).map(c => c.closing_date)}
      />
    </div>
  )
}
