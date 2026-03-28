import { cn } from "@/lib/utils";
import { ASSET_STATUS_CONFIG } from "@/types/asset";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const config = ASSET_STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    dotColor: "bg-gray-500",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        config.bgColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );
}
