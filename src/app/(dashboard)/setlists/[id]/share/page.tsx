import { isProUser } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { SharePageClient } from "./share-client";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;

  const isPro = await isProUser();
  if (!isPro) {
    return <UpgradePrompt feature="Sharing" />;
  }

  return <SharePageClient setlistId={id} />;
}
