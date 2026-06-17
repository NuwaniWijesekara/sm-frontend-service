import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ink text-chalk hover:bg-ink/80 disabled:bg-ink/40",
  secondary:
    "bg-surface text-ink border-2 border-border hover:border-accent hover:text-accent disabled:opacity-40",
  ghost:
    "bg-transparent text-ink hover:bg-border disabled:opacity-40",
  danger:
    "bg-danger text-white hover:bg-danger/80 disabled:opacity-40",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-sm rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2",
        "font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "disabled:cursor-not-allowed select-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current
                       border-t-transparent animate-spin"
            aria-hidden
          />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}