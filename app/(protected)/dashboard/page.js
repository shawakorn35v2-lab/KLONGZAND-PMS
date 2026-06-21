import { createClient } from '@/lib/supabase-server'
import RoomGrid from '@/components/RoomGrid'
import MonthlySalesChart from '@/components/charts/MonthlySalesChart'
import ChannelChart from '@/components/charts/ChannelChart'
import OccupancyChart from '@/components/charts/OccupancyChart'
import OccupancyMonthCard from '@/components/OccupancyMonthCard'
import ExportButtons from '@/components/ExportButtons'
import { getTodayString, formatLongDate } from '@/lib/dateUtils'

function fmt(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

function StatCard({ label, value, sub, color }) {
  const colors = {
    green: 'border-t-green-500',
    red: 'border-t-red-500',
    blue: 'border-t-blue-500',
    gray: 'border-t-gray-400',
  }
  return (
    <div className={`card border-t-4 ${colors[color] ?? colors.gray}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = getTodayString()
  const monthStart = today.slice(0, 7) + '-01'
  const now = new Date()
  const agoDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const twelveMonthsAgo = `${agoDate.getFullYear()}-${String(agoDate.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: rooms },
    { data: activeBookings },
    { data: todayTxs },
    { data: monthTxs },
    { data: yearTxs },
    { data: allBookings },
    { data: allTimeTxs },
    { count: totalBookingsCount },
    { data: occupancyBookings },
  ] = await Promise.all([
    supabase.from('rooms').select('*').eq('is_active', true).order('room_no'),
    supabase.from('bookings').select('room_id, status').in('status', ['reserved', 'checked_in']),
    supabase.from('transactions').select('tx_type, amount').eq('tx_date', today),
    supabase.from('transactions').select('tx_type, amount').gte('tx_date', monthStart),
    supabase.from('transactions').select('tx_date, tx_type, amount').gte('tx_date', twelveMonthsAgo),
    supabase.from('bookings').select('room_id, channel, price, status').gte('checkin_date', twelveMonthsAgo),
    supabase.from('transactions').select('tx_type, amount'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('room_id, checkin_date, checkout_date').neq('status', 'cancelled').gte('checkout_date', twelveMonthsAgo),
  ])

  const calcStats = (txs) => {
    const income = (txs ?? []).filter(t => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = (txs ?? []).filter(t => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { income, expense, net: income - expense }
  }

  const todayStats = calcStats(todayTxs)
  const monthStats = calcStats(monthTxs)

  const checkedInCount = (activeBookings ?? []).filter(b => b.status === 'checked_in').length
  const totalRooms = (rooms ?? []).length
  const occupancyRate = totalRooms > 0 ? ((checkedInCount / totalRooms) * 100).toFixed(1) : '0.0'

  // All-time stats
  const allTimeIncome = (allTimeTxs ?? []).filter(t => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const allTimeExpense = (allTimeTxs ?? []).filter(t => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const allTimeNet = allTimeIncome - allTimeExpense

  // Real-time occupancy (date-based)
  const occupiedRoomIds = new Set()
  ;(occupancyBookings ?? []).forEach(b => {
    if (b.checkin_date <= today && b.checkout_date > today) occupiedRoomIds.add(b.room_id)
  })
  ;(rooms ?? []).forEach(r => {
    if (r.is_monthly && r.monthly_start_date && r.monthly_start_date <= today &&
        (!r.monthly_end_date || r.monthly_end_date >= today)) {
      occupiedRoomIds.add(r.id)
    }
  })
  const realtimeOccupied = occupiedRoomIds.size
  const realtimeRate = totalRooms > 0 ? ((realtimeOccupied / totalRooms) * 100).toFixed(1) : '0.0'

  // Current month string for OccupancyMonthCard default
  const currentMonth = today.slice(0, 7)

  const exportCols = [
    { key: 'tx_date', header: 'วันที่', format: 'date' },
    { key: 'tx_type', header: 'ประเภท', format: 'txtype' },
    { key: 'amount', header: 'จำนวนเงิน', format: 'number2' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatLongDate(today)}
          </p>
        </div>
        <ExportButtons
          data={yearTxs ?? []}
          filename="รายรับ-รายจ่าย-12เดือน"
          title="สรุปรายรับ-รายจ่าย 12 เดือน"
          columns={exportCols}
        />
      </div>

      {/* Today stats */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">วันนี้</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="รายรับวันนี้" value={fmt(todayStats.income)} color="green" />
          <StatCard label="รายจ่ายวันนี้" value={fmt(todayStats.expense)} color="red" />
          <StatCard label="กำไรสุทธิวันนี้" value={fmt(todayStats.net)} color={todayStats.net >= 0 ? 'blue' : 'red'} />
          <StatCard label="Occupancy" value={`${occupancyRate}%`} sub={`${checkedInCount} / ${totalRooms} ห้อง`} color="blue" />
        </div>
      </div>

      {/* Month stats */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">เดือนนี้</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="รายรับเดือนนี้" value={fmt(monthStats.income)} color="green" />
          <StatCard label="รายจ่ายเดือนนี้" value={fmt(monthStats.expense)} color="red" />
          <StatCard label="กำไรสุทธิเดือนนี้" value={fmt(monthStats.net)} color={monthStats.net >= 0 ? 'blue' : 'red'} />
        </div>
      </div>

      {/* All-time cumulative stats */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ภาพรวมสะสมทั้งหมด</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="รายรับสะสม" value={fmt(allTimeIncome)} color="green" />
          <StatCard label="รายจ่ายสะสม" value={fmt(allTimeExpense)} color="red" />
          <StatCard label="กำไรสุทธิสะสม" value={fmt(allTimeNet)} color={allTimeNet >= 0 ? 'blue' : 'red'} />
          <StatCard label="การจองทั้งหมด" value={`${(totalBookingsCount ?? 0).toLocaleString()} ครั้ง`} color="gray" />
        </div>
      </div>

      {/* Real-time occupancy */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Occupancy เรียลไทม์ (ตอนนี้)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="ห้องที่มีคนพักอยู่ตอนนี้"
            value={`${realtimeOccupied} / ${totalRooms} ห้อง`}
            sub={`อัตราเข้าพัก ${realtimeRate}%`}
            color="blue"
          />
        </div>
      </div>

      {/* Room grid */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">สถานะห้องพัก</h2>
        <RoomGrid rooms={rooms ?? []} bookings={activeBookings ?? []} />
      </div>

      {/* Occupancy monthly section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OccupancyMonthCard
          rooms={rooms ?? []}
          occupancyBookings={occupancyBookings ?? []}
          initialMonth={currentMonth}
        />
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">อัตราเข้าพักรายเดือน (12 เดือน)</h2>
          <OccupancyChart rooms={rooms ?? []} occupancyBookings={occupancyBookings ?? []} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">ยอดขายรายเดือน (12 เดือน)</h2>
          <MonthlySalesChart transactions={yearTxs ?? []} />
        </div>
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">สัดส่วนช่องทางการจอง</h2>
          <ChannelChart bookings={allBookings ?? []} />
        </div>
      </div>
    </div>
  )
}
