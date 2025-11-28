import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
        success:
          "bg-emerald-50 text-emerald-900 border-emerald-200 [&>svg]:text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-800 dark:[&>svg]:text-emerald-400",
        warning:
          "bg-amber-50 text-amber-900 border-amber-200 [&>svg]:text-amber-600 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-800 dark:[&>svg]:text-amber-400",
        info: "bg-blue-50 text-blue-900 border-blue-200 [&>svg]:text-blue-600 dark:bg-blue-950/50 dark:text-blue-100 dark:border-blue-800 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface AlertProps extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function Alert({
  className,
  variant,
  dismissible,
  onDismiss,
  action,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), "animate-fade-in", className)}
      {...props}
    >
      {children}
      {(dismissible || action) && (
        <div className="col-start-2 flex items-center gap-2 mt-2">
          {action && (
            <Button size="sm" variant="outline" onClick={action.onClick} className="h-7 text-xs">
              {action.label}
            </Button>
          )}
          {dismissible && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-7 w-7 p-0 ml-auto"
              aria-label="閉じる"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
