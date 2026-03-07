import { Music } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-8">
        <Music className="w-8 h-8 text-primary" />
        <span className="text-2xl font-bold">SetList</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
