// app/doc/[shareId]/page.tsx
import prisma from "@/lib/prisma";

export default async function DocSharePage({ params }: { params: { shareId: string } }) {
  const share = await prisma.documentShare.findUnique({
    where: { id: params.shareId },
    include: { document: true },
  });

  if (!share || !share.document) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        Share not found.
      </div>
    );
  }

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-300">
        This share has expired.
      </div>
    );
  }

  const src = `/doc/${params.shareId}/download`; // inline, already watermarked

  return (
    <div className="w-screen h-screen bg-black">
      <div className="h-12 px-4 flex items-center justify-between text-sm text-gray-300 border-b border-white/10">
        <div className="truncate">
          Viewing: <span className="text-white font-medium">{share.document.filename}</span>
        </div>
        <a
          href={`/doc/${params.shareId}/download?download=1`}
          className="rounded-md bg-white/5 border border-white/10 px-3 py-1 hover:bg-white/10"
        >
          Download (watermarked)
        </a>
      </div>
      <iframe
        src={src}
        className="w-full h-[calc(100vh-3rem)]"
        title="Document"
      />
    </div>
  );
}