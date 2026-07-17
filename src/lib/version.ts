export function shortRevision(value: string | undefined) {
  const revision = value?.trim();
  return revision && /^[0-9a-f]{7,40}$/i.test(revision) ? revision.slice(0, 7) : undefined;
}
