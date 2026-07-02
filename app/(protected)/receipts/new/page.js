import Link from 'next/link'
import ReceiptForm from '@/components/ReceiptForm'

export default function NewReceiptPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <Link href="/receipts" className="text-sm text-blue-600 hover:text-blue-800">← กลับไปรายการใบเสร็จ</Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-1">สร้างใบเสร็จใหม่</h1>
        <p className="text-sm text-gray-500 mt-0.5">กรอกข้อมูลลูกค้าและรายการ ระบบจะสร้างเลขที่ใบเสร็จให้อัตโนมัติ</p>
      </div>
      <ReceiptForm />
    </div>
  )
}
