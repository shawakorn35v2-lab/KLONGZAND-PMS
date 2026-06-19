import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import LayoutShell from '@/components/LayoutShell'

export default async function ProtectedLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return <LayoutShell user={profile}>{children}</LayoutShell>
}
