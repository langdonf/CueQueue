import { notFound } from "next/navigation";
import { getSetlist } from "@/actions/setlist-actions";
import { LiveModeView } from "@/components/live/LiveModeView";
import { isProUser } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

interface LivePageProps {
  params: Promise<{ id: string }>;
}

export default async function LivePage({ params }: LivePageProps) {
  const { id } = await params;

  const isPro = await isProUser();
  if (!isPro) {
    return <UpgradePrompt feature="Live Mode" />;
  }

  const result = await getSetlist(id);

  if (result.error || !result.data) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const songs = (result.data.setlist_songs ?? []).map((ss: any) => ({
    position: ss.position,
    ...ss.song,
  }));

  return (
    <LiveModeView
      setlistName={result.data.name}
      setlistId={id}
      songs={songs}
    />
  );
}
