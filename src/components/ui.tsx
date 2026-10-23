import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, X } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[6px] text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        amber: "bg-amber px-5 py-2.5 text-[#2a160c] hover:bg-[#f0ad62]",
        ghost: "bg-transparent px-3 py-2 text-cream hover:bg-white/5",
        outline: "border border-line bg-transparent px-5 py-2.5 text-cream hover:border-amber",
      },
      size: {
        md: "h-10",
        sm: "h-9 px-4 text-xs",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "amber", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[6px] border border-line bg-ink px-3 text-sm text-cream outline-none placeholder:text-faint focus-visible:border-amber",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-sm text-muted", className)} {...props} />;
}

export function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="text-xs text-[#ffb4a8]">
      {children}
    </p>
  );
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</DialogPrimitive.Root>
  );
}

export function DialogContent({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[min(440px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl border border-line bg-ink-2 p-6 shadow-2xl",
          className,
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <DialogPrimitive.Title className="text-xl font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded-full p-1 text-muted hover:text-cream" aria-label="Fechar">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  count,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  count?: number;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm">
      <span className="flex items-center gap-2">
        <CheckboxPrimitive.Root
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="flex size-4 items-center justify-center rounded border border-line data-[state=checked]:border-amber data-[state=checked]:bg-amber"
        >
          <CheckboxPrimitive.Indicator>
            <Check className="size-3 text-[#2a160c]" />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <span className={checked ? "text-cream" : "text-muted"}>{label}</span>
      </span>
      {typeof count === "number" ? <span className="text-xs text-faint">({count})</span> : null}
    </label>
  );
}

export function RangeSlider({
  value,
  onValueChange,
  min,
  max,
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
}) {
  return (
    <SliderPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={1}
      className="relative flex h-5 w-full touch-none items-center"
      aria-label="Faixa de preço"
    >
      <SliderPrimitive.Track className="relative h-1 grow rounded-full bg-[#3a2c24]">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-amber" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3.5 rounded-full bg-amber" />
      <SliderPrimitive.Thumb className="block size-3.5 rounded-full bg-amber" />
    </SliderPrimitive.Root>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} aria-hidden="true" />;
}
