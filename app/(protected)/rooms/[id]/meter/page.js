import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import MeterForm from '@/components/MeterForm'
import MeterClient from './MeterClient'
import Link from 'next/link'

function fmt(n) { return '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

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
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-4 md:mb-6">
        <Link href="/rooms" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-3">
          ← กลับไปหน้าห้องพัก
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
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
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">ประวัติย้อนหลัง</h2>
              <p className="text-xs text-gray-400">กด 🖨 เพื่อพิมพ์ใบแจ้งหนี้แต่ละรอบ</p>
            </div>
            <MeterClient readings={readings ?? []} room={room} />
          </div>
        </div>
      )}
    </div>
  )
}
