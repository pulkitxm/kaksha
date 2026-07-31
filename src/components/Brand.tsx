import Image from "next/image";

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        priority
        className="h-8 w-8 rounded-lg"
      />
      <div className="leading-tight">
        <h1 className="text-sm font-semibold">Kaksha</h1>
        <p className="text-xs text-fg-faint">Session 2025-26</p>
      </div>
    </div>
  );
}
