const tierColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

export default function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
        tierColors[tier] ?? "bg-gray-100 text-gray-800 border-gray-200"
      }`}
    >
      {tier}
    </span>
  );
}
