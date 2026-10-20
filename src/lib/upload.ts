export const BUCKET = 'project-files'
export const MAX_BYTES = 15 * 1024 * 1024
export const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `${file.name}: unsupported file type (use JPG, PNG, WebP, PDF, Word or Excel)`
  if (file.size > MAX_BYTES) return `${file.name}: larger than 15 MB`
  return null
}

const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80)

/** Uploads to  <company_id>/<folder>/<uuid>-<name>  in the private bucket and returns the storage path. */
export async function uploadFile(sb: any, companyId: string, folder: string, file: File): Promise<string> {
  const bad = validateFile(file)
  if (bad) throw new Error(bad)
  const path = `${companyId}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(error.message)
  return path
}
