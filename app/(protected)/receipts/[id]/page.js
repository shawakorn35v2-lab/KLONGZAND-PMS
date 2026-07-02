import { notFound } from 'next/navigation'
import { getReceipt } from '@/app/actions/receipts'
import ReceiptPreview from '@/components/ReceiptPreview'

export default async function ReceiptDetailPage({ params }) {
  const { id } = await params
  const { data, error } = await getReceipt(id)
  if (error || !data) notFound()

  return (
    <div className="p-4 md:p-6">
      <ReceiptPreview receipt={data} />
    </div>
  )
}
