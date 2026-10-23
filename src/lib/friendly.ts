/** Turns raw database errors into messages a contractor can act on. */
export function friendly(msg: string): string {
  if (/row-level security|violates row-level/i.test(msg)) return 'This action is not allowed on your current plan or role. If your trial has ended, choose a plan in Settings → Plan & Billing.'
  if (/Project limit/i.test(msg)) return msg
  if (/duplicate key/i.test(msg)) return 'That record already exists.'
  return msg
}
