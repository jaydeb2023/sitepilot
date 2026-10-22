/** In-memory client cache shared by every page. Lets pages render instantly from the last known data while they refresh in the background. */
const m = new Map<string, any>()
export const store = {
  get: (k: string): any => m.get(k),
  set: (k: string, v: any) => { m.set(k, v) },
  has: (k: string) => m.has(k),
}
export const rowKey = (table: string, select: string | undefined, ...f: string[]) => ['rows', table, select || '*', ...f].join('|')
