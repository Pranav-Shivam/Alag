export default function StepBadge({ id }: { id: number }) {
  return (
    <span className="inline-grid h-7 min-w-7 shrink-0 place-items-center rounded-lg border border-warn-line bg-warn-soft px-1.5 text-xs font-semibold tabular-nums text-warn-fg">
      <span className="sr-only">Step </span>
      {id}
    </span>
  );
}
