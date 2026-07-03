import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getReceipt } from '@/app/actions/receipts'
import ReceiptForm from '@/components/ReceiptForm'

export default async function EditReceiptPage({ params }) {
  const { id } = await params
  const { data, error } = await getReceipt(id)
  if (error || !data) notFound()

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <Link href={`/receipts/${id}`} className="text-sm text-blue-600 hover:text-blue-800">
          ← กลับไปดูใบเสร็จ
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
          แก้ไขใบเสร็จ {data.receipt_no}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          ระบบจะเก็บเลขที่ใบเสร็จเดิมและบันทึกประวัติการแก้ไข
        </p>
      </div>
      <ReceiptForm initialReceipt={data} />
    </div>
  )
}
