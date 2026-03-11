type ProfileDisplayProps = {
  label: string;
  value: string | null | undefined;
  placeholder?: string;
};

export function ProfileDisplay({ label, value, placeholder = "—" }: ProfileDisplayProps) {
  const display = (value?.trim() && value.trim().length > 0) ? value.trim() : placeholder;
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium text-[var(--cream-muted)]">{label}</p>
      <p className="text-sm font-medium text-[var(--cream)]">{display}</p>
    </div>
  );
}
