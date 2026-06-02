import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "local";

interface Props {
  status: SaveStatus;
  hasHandle: boolean;
  supported: boolean;
}

export const StatusBadge = ({ status, hasHandle, supported }: Props) => {
  let dotClass = "bg-muted-foreground";
  let label = "Browser storage";
  let pulse = false;

  if (hasHandle) {
    if (status === "saving") {
      dotClass = "bg-amber-500";
      label = "File storage · saving…";
      pulse = true;
    } else if (status === "error") {
      dotClass = "bg-destructive";
      label = "File storage · save failed";
    } else {
      dotClass = "bg-emerald-500";
      label = "File storage";
    }
  } else if (status === "saved") {
    dotClass = "bg-emerald-500";
    label = "Browser storage";
  } else {
    dotClass = "bg-muted-foreground";
    label = supported ? "Browser storage" : "Browser storage";
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      title={label}
      aria-live="polite"
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              dotClass
            )}
          />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotClass)} />
      </span>
      {label}
    </span>
  );
};
