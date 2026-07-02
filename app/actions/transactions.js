'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function createTransaction(data) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { error } = await supabase.from('transactions').insert({
    ...data,
    amount: Number(data.amount),
    created_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaction(id, txDate) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  // Find inventory movements linked to this transaction
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('id, item_id, movement_type, quantity')
    .eq('transaction_id', id)

  if (movements && movements.length > 0) {
    // Restore stock for each linked movement (reverse the original operation)
    for (const mv of movements) {
      const { data: item } = await supabase
        .from('inventory_items')
        .select('current_stock')
        .eq('id', mv.item_id)
        .maybeSingle()

      if (item) {
        // stock_in added stock → subtract back; stock_out/sale deducted stock → add back
        const restoredStock = mv.movement_type === 'stock_in'
          ? Number(item.current_stock) - Number(mv.quantity)
          : Number(item.current_stock) + Number(mv.quantity)

        const { error: stockErr } = await supabase
          .from('inventory_items')
          .update({ current_stock: restoredStock })
          .eq('id', mv.item_id)
        if (stockErr) return { error: 'คืนสต๊อกไม่สำเร็จ: ' + stockErr.message }
      }
    }

    // Delete all linked movements
    const { error: mvErr } = await supabase
      .from('inventory_movements')
      .delete()
      .eq('transaction_id', id)
    if (mvErr) return { error: 'ลบข้อมูลสต๊อกไม่สำเร็จ: ' + mvErr.message }
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/inventory')
  return { success: true }
}
