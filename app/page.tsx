import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function Home() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')

  return (
    <div style={{ padding: 40 }}>
      <h1>Teste Supabase</h1>

      {error && (
        <p style={{ color: 'red' }}>
          Erro: {error.message}
        </p>
      )}

      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}