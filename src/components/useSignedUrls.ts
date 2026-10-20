'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BUCKET } from '@/lib/upload'

/** Resolves private storage paths to short-lived signed URLs. */
export function useSignedUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = paths.join('|')
  useEffect(() => {
    if (!paths.length) { setUrls({}); return }
    let live = true
    createClient().storage.from(BUCKET).createSignedUrls(paths, 3600).then(({ data }: any) => {
      if (!live) return
      const m: Record<string, string> = {}
      data?.forEach((d: any) => { if (d.path && d.signedUrl) m[d.path] = d.signedUrl })
      setUrls(m)
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return urls
}
