type Props = {
  title: string;
  value: string;
  change?: string;
};

export function KpiCard({ title, value, change }: Props) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500">{title}</p>

      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{value}</h2>

        {change && (
          <span className="text-sm text-green-500 font-medium">{change}</span>
        )}
      </div>
    </div>
  );
}
