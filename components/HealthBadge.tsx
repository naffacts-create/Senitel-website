type Props = {
  isUp: boolean | null;
  lastError: string | null;
};

/** Compact up/down/unknown pill. */
export function HealthBadge({ isUp, lastError }: Props) {
  if (isUp === null) {
    return <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">Not checked</span>;
  }
  if (isUp) {
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-ok">Up</span>;
  }
  return (
    <span
      className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-danger"
      title={lastError ?? undefined}
    >
      Down
    </span>
  );
}
