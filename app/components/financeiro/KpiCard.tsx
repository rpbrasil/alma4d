type Props = {
  title: string;
  value: string;
  change?: string;
  valueClass?: string;
};

export function KpiCard({ title, value, change, valueClass }: Props) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500">{title}</p>

      <div className="mt-2 flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${valueClass || "text-primary"}`}>
          {value}
        </h2>

        {change && (
          <span className="text-sm text-green-500 font-medium">{change}</span>
        )}
      </div>
    </div>
  );
}
