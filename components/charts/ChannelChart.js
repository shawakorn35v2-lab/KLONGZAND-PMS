'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#8b5cf6', '#ec4899']
const CHANNEL_LABELS = { walkin: 'Walk-in', agoda: 'Agoda', line: 'Line', facebook: 'Facebook', sale: 'Sale' }

function formatCurrency(v) {
  return '฿' + Number(v).toLocaleString('th-TH')
}

export default function ChannelChart({ bookings }) {
  const channelData = {}
  ;(bookings ?? []).forEach(b => {
    if (b.status === 'cancelled') return
    if (!channelData[b.channel]) channelData[b.channel] = { count: 0, amount: 0 }
    channelData[b.channel].count++
    channelData[b.channel].amount += Number(b.price)
  })

  const data = Object.entries(channelData).map(([ch, v]) => ({
    name: CHANNEL_LABELS[ch] ?? ch,
    value: v.amount,
    count: v.count,
  }))

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
