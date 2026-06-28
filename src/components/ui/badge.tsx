import { cn, getStatusColor } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
  dot?: boolean;
}

const statusDots: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-gray-400",
  locked: "bg-red-500",
  pending: "bg-yellow-500",
  available: "bg-green-500",
  borrowing: "bg-blue-500",
  reserved: "bg-purple-500",
  damaged: "bg-orange-500",
  lost: "bg-red-500",
  overdue: "bg-red-500",
  paid: "bg-green-500",
  unpaid: "bg-yellow-500",
};

export function Badge({ status, className, dot = false }: BadgeProps) {
  const { bg, text, label } = getStatusColor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
        bg,
        text,
        className
      )}
    >
      {dot && (
        <span className={cn(
          "h-1.5 w-1.5 rounded-full",
          statusDots[status] || "bg-gray-400"
        )} />
      )}
      {label}
    </span>
  );
}
