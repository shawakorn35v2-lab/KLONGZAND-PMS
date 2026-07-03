'use client'

import { useState, useMemo } from 'react'

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function fmt(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

export default function MonthlyFinanceCard({ transactions, initialMonth }) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

  const monthOptions = useMemo(() => {
    const now = new Date()
    const opts = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
      opts.push({ value, label })
    }
    return opts
  }, [])

  const { income, expense, net, count, topIncome, topExpense } = useMemo(() => {
    const monthTxs = (transactions ?? []).filter(t => (t.tx_date || '').startsWith(selectedMonth))
    let inc = 0, exp = 0
    const incomeByCat = {}
    const expenseByCat = {}
    monthTxs.forEach(t => {
      const amt = Number(t.amount) || 0
      const cat = t.category || 'อื่นๆ'
      if (t.tx_type === 'income') {
        inc += amt
        incomeByCat[cat] = (incomeByCat[cat] || 0) + amt
      } else if (t.tx_type === 'expense') {
        exp += amt
        expenseByCat[cat] = (expenseByCat[cat] || 0) + amt
      }
    })
    const topIn = Object.entries(incomeByCat).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const topEx = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]).slice(0, 3)
    return { income: inc, expense: exp, net: inc - exp, count: monthTxs.length, topIncome: topIn, topExpense: topEx }
  }, [transactions, selectedMonth])

  const selectedLabel = monthOptions.find(o => o.value === selectedMonth)?.label ?? selectedMonth

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-900">รายรับ-รายจ่ายรายเดือน</h2>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border-t-4 border-t-green-500 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">รายรับ</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(income)}</p>
        </div>
        <div className="rounded-lg border-t-4 border-t-red-500 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">รายจ่าย</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{fmt(expense)}</p>
        </div>
        <div className={`rounded-lg border-t-4 ${net >= 0 ? 'border-t-blue-500' : 'border-t-red-500'} bg-white p-4 shadow-sm`}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">กำไรสุทธิ</p>
          <p className={`text-xl font-bold mt-1 ${net >= 0 ? 'text-gray-900' : 'text-red-700'}`}>{fmt(net)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">หมวดรายรับสูงสุด</p>
          {topIncome.length === 0 ? (
            <p className="text-xs text-gray-400">— ไม่มีรายรับ</p>
          ) : (
            <ul className="space-y-1">
              {topIncome.map(([cat, amt]) => (
                <li key={cat} className="flex justify-between text-sm">
                  <span className="text-gray-700">{cat}</span>
                  <span className="font-medium text-green-700">{fmt(amt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">หมวดรายจ่ายสูงสุด</p>
          {topExpense.length === 0 ? (
            <p className="text-xs text-gray-400">— ไม่มีรายจ่าย</p>
          ) : (
            <ul className="space-y-1">
              {topExpense.map(([cat, amt]) => (
                <li key={cat} className="flex justify-between text-sm">
                  <span className="text-gray-700">{cat}</span>
                  <span className="font-medium text-red-700">{fmt(amt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">{selectedLabel} — {count.toLocaleString('th-TH')} รายการ</p>
    </div>
  )
}
