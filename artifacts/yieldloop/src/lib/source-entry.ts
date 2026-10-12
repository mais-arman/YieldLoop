/** Job visibility is already established before its materials panel is mounted. */
export function missingSourceEntry(entryId: number | null, error: unknown): boolean {
  return Boolean(entryId && error && typeof error === 'object' && 'status' in error && error.status === 404);
}
