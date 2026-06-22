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

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
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
