export function assertNotUndefined<T>(value: T | undefined, msg: string): T {
  if (!value) throw new Error(msg);
  return value;
}
