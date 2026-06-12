type Props = {
  title: string;
  value: string;
  change?: string;
  valueClass?: string;
};

export function KpiCard({ title, value, change, valueClass }: Props) {
  return (
    <div className="bg-surface p-5 rounded-xl shadow-sm">
      <p className="text-sm text-secondary">{title}</p>

      <div className="mt-2 flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${valueClass || "text-primary"}`}>
          {value}
        </h2>

        {change && (
          <span
            className={`text-sm font-medium ${
              change.startsWith("+")
                ? "text-brand-secondary"
                : "text-brand-accent"
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
