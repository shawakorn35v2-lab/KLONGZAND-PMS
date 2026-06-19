'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatCurrency(v) {
  return '฿' + Number(v).toLocaleString('th-TH')
}

export default function MonthlySalesChart({ transactions }) {
  const now = new Date()
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTHS_TH[d.getMonth()] })
  }

  const data = months.map(m => {
    const monthTxs = (transactions ?? []).filter(t => {
      const d = new Date(t.tx_date)
      return d.getFullYear() === m.year && d.getMonth() === m.month
    })
    const income = monthTxs.filter(t => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = monthTxs.filter(t => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { name: m.label, รายรับ: income, รายจ่าย: expense }
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={v => `฿${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        <Bar dataKey="รายรับ" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="รายจ่าย" fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
