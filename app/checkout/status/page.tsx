import StatusClient from "./StatusClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ contratoId?: string }>;
}) {
  const params = await searchParams;
  const contratoId = params?.contratoId ?? null;

  return <StatusClient contratoId={contratoId} />;
}
