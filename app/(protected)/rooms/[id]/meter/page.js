import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import MeterForm from '@/components/MeterForm'
import Link from 'next/link'

function fmt(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }
function fmtUnits(n) { return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

function fmtMonth(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
}

export default async function MeterPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, room_no, building, is_monthly, monthly_rent')
    .eq('id', id)
    .single()

  if (!room) notFound()

  const { data: readings } = await supabase
    .from('meter_readings')
    .select('*')
    .eq('room_id', id)
    .order('billing_month', { ascending: false })
    .limit(24)

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/rooms" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-3">
          ← กลับไปหน้าห้องพัก
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          มิเตอร์ห้อง {room.room_no} (อาคาร {room.building})
        </h1>
        {room.monthly_rent > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">ค่าเช่ารายเดือน: {fmt(room.monthly_rent)}/เดือน</p>
        )}
      </div>

      {!room.is_monthly ? (
        <div className="card text-center text-gray-500 py-12">
          <p className="text-4xl mb-3">⚡</p>
          <p className="font-medium">ห้องนี้ไม่ใช่ห้องเช่ารายเดือน</p>
          <p className="text-sm mt-1">เปิดใช้งาน "รายเดือน" ในหน้าจัดการห้องพักก่อน</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">กรอกข้อมูลมิเตอร์</h2>
            <MeterForm roomId={id} />
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">ประวัติย้อนหลัง</h2>
            </div>
            {(readings ?? []).length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">ยังไม่มีประวัติมิเตอร์</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">รอบบิล</th>
                      <th className="table-th text-right">มิเตอร์ก่อน</th>
                      <th className="table-th text-right">มิเตอร์หลัง</th>
                      <th className="table-th text-right">หน่วยที่ใช้</th>
                      <th className="table-th text-right">ราคา/หน่วย</th>
                      <th className="table-th text-right">ค่าไฟ</th>
                      <th className="table-th text-right">ค่าน้ำ</th>
                      <th className="table-th text-right font-bold">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {readings.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="table-td font-medium">{fmtMonth(r.billing_month)}</td>
                        <td className="table-td text-right">{fmtUnits(r.prev_reading)}</td>
                        <td className="table-td text-right">{fmtUnits(r.curr_reading)}</td>
                        <td className="table-td text-right">{fmtUnits(r.curr_reading - r.prev_reading)}</td>
                        <td className="table-td text-right">{fmt(r.unit_price)}</td>
                        <td className="table-td text-right">{fmt(r.electric_cost)}</td>
                        <td className="table-td text-right">{fmt(r.water_flat_fee)}</td>
                        <td className="table-td text-right font-semibold text-blue-700">{fmt(r.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
