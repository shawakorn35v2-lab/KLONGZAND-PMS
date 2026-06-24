'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function createTransaction(data) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { data: existing } = await supabase
    .from('daily_closings')
    .select('id')
    .eq('closing_date', data.tx_date)
    .single()

  if (existing) return { error: 'วันที่นี้ถูกปิดยอดแล้ว ไม่สามารถเพิ่มรายการได้' }

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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: tx } = await supabase.from('transactions').select('is_closed').eq('id', id).single()
  if (tx?.is_closed && !isAdmin) return { error: 'ไม่สามารถลบรายการที่ปิดยอดแล้ว' }

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

export async function closeDailyTransactions(date) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ไม่ได้เข้าสู่ระบบ' }

  const { data: existing } = await supabase
    .from('daily_closings')
    .select('id')
    .eq('closing_date', date)
    .single()
  if (existing) return { error: 'วันที่นี้ถูกปิดยอดแล้ว' }

  const { data: txs } = await supabase
    .from('transactions')
    .select('tx_type, amount')
    .eq('tx_date', date)

  const totalIncome = txs?.filter(t => t.tx_type === 'income').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const totalExpense = txs?.filter(t => t.tx_type === 'expense').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const netAmount = totalIncome - totalExpense

  const { error: closeErr } = await supabase.from('daily_closings').insert({
    closing_date: date,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_amount: netAmount,
    closed_by: user.id,
  })
  if (closeErr) return { error: closeErr.message }

  await supabase
    .from('transactions')
    .update({ is_closed: true })
    .eq('tx_date', date)
    .eq('is_closed', false)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  return { success: true }
}
