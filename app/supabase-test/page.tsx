import { supabase } from '@/lib/supabase/client'

export default async function SupabaseTestPage() {
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('id, title, status, video_url, clips(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return <pre>Supabase error: {error.message}</pre>
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase Test</h1>
      <pre>{JSON.stringify(reviews, null, 2)}</pre>
    </main>
  )
}