"use client";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string };
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string };
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: React.ReactNode;
};

const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500";

export function FormInput({ label, className, ...props }: InputProps) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={`admin-input ${className ?? ""}`} {...props} />
    </div>
  );
}

export function FormTextarea({ label, className, ...props }: TextareaProps) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <textarea className={`admin-input ${className ?? ""}`} {...props} />
    </div>
  );
}

export function FormSelect({ label, className, children, ...props }: SelectProps) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select className={`admin-input ${className ?? ""}`} {...props}>
        {children}
      </select>
    </div>
  );
}

export function FormCheckbox({
  label,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        className="rounded border-gray-300 bg-white text-[var(--accent)] focus:ring-[var(--accent)]"
        {...props}
      />
      <label htmlFor={id} className="text-sm text-[var(--cream-muted)]">
        {label}
      </label>
    </div>
  );
}
