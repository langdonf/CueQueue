import { Music } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-10">
        <Music className="w-6 h-6 text-primary" />
        <span className="text-xl font-medium">SetList</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
