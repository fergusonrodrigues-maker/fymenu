import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  try {
    const { data: units } = await supabase
      .from('units')
      .select('slug')
      .eq('is_active', true);

    if (!units) {
      return [{ url: 'https://fymenu.vercel.app', lastModified: new Date() }];
    }

    const routes = units.map((unit) => ({
      url: `https://fymenu.com/delivery/${unit.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    return [
      {
        url: 'https://fymenu.vercel.app',
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 1,
      },
      ...routes,
    ];
  } catch (error) {
    console.error('Erro ao gerar sitemap:', error);
    return [{ url: 'https://fymenu.vercel.app', lastModified: new Date() }];
  }
}
