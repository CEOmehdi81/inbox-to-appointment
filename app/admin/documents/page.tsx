// app/admin/documents/page.tsx
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";
import fs from "fs/promises";
import prisma from "@/lib/prisma";
import { makeSecret } from "@/lib/documents";
import type { Document, DocumentShare } from "@prisma/client";
import ConfirmSubmit from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";

/* --------------------------- utils --------------------------- */
function dtLocalValue(d?: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
function fromDtLocal(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/* ---------------------- server actions ----------------------- */
async function upload(formData: FormData) {
  "use server";

  const file = formData.get("file") as File | null;
  const email = String(formData.get("email") || "").trim();
  if (!file || file.size === 0) return;

  const docsDir = path.join(process.cwd(), "public", "docs");
  await fs.mkdir(docsDir, { recursive: true });

  const orig = file.name.replace(/[^\w\-.]+/g, "_");
  const filename = `${Date.now()}__${orig}`;
  const storageKey = path.posix.join("docs", filename);

  const fileBuf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(docsDir, filename), fileBuf);

  const doc = await prisma.document.create({
    data: {
      ownerEmail: "me@example.com", // TODO: wire to your auth
      filename: orig,
      storageKey,
      totpSecret: makeSecret(),
    },
  });

  if (email) {
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.documentShare.create({
      data: {
        documentId: doc.id,
        recipientEmail: email,
        expiresAt: in30Days,
        canDownload: true,
      },
    });
  }

  revalidatePath("/admin/documents");
}

async function createShare(formData: FormData) {
  "use server";

  const documentId = String(formData.get("documentId") || "");
  const email = String(formData.get("email") || "").trim();
  if (!documentId || !email) return;

  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.documentShare.create({
    data: {
      documentId,
      recipientEmail: email,
      expiresAt: in30Days,
      canDownload: true,
    },
  });

  revalidatePath("/admin/documents");
}

async function openWithWatermark(formData: FormData) {
  "use server";

  const documentId = String(formData.get("documentId") || "");
  if (!documentId) return;

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;

  let share = await prisma.documentShare.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });

  if (!share) {
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    share = await prisma.documentShare.create({
      data: {
        documentId,
        recipientEmail: doc.ownerEmail ?? "preview@local",
        expiresAt: in30Days,
        canDownload: true,
      },
    });
  }

  redirect(`/doc/${share.id}`);
}

async function toggleShareDownload(formData: FormData) {
  "use server";

  const shareId = String(formData.get("shareId") || "");
  const allow = String(formData.get("allow") || "") === "true";
  if (!shareId) return;

  await prisma.documentShare.update({
    where: { id: shareId },
    data: { canDownload: allow },
  });

  revalidatePath("/admin/documents");
}

async function renameDocument(formData: FormData) {
  "use server";

  const documentId = String(formData.get("documentId") || "");
  const filename = String(formData.get("filename") || "").trim();
  if (!documentId || !filename) return;

  await prisma.document.update({
    where: { id: documentId },
    data: { filename },
  });

  revalidatePath("/admin/documents");
}

async function updateShareExpiry(formData: FormData) {
  "use server";

  const shareId = String(formData.get("shareId") || "");
  const raw = formData.get("expiresAt") as string | null;
  if (!shareId) return;

  const expiresAt = fromDtLocal(raw);
  await prisma.documentShare.update({
    where: { id: shareId },
    data: { expiresAt: expiresAt ?? undefined },
  });

  revalidatePath("/admin/documents");
}

async function revokeShare(formData: FormData) {
  "use server";

  const shareId = String(formData.get("shareId") || "");
  if (!shareId) return;

  await prisma.documentShare.delete({ where: { id: shareId } });
  revalidatePath("/admin/documents");
}

/* --------------------------- page ---------------------------- */
type DocWithShares = Document & { shares: DocumentShare[] };

export default async function DocumentsPage() {
  const docs: DocWithShares[] = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { shares: { orderBy: { createdAt: "desc" } } },
  });

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-3">Documents</h2>

        <form action={upload} className="grid md:grid-cols-[1fr,260px,auto] gap-3">
          <input
            type="file"
            name="file"
            accept="application/pdf"
            required
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <input
            type="email"
            name="email"
            placeholder="Recipient email (optional share)"
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10">
            Upload
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-white/[0.02] text-xs text-gray-400">
                <th className="text-left font-medium px-4 py-3">File</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
                <th className="text-left font-medium px-4 py-3">Shares</th>
                <th className="text-left font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                    No documents yet. Upload a PDF above.
                  </td>
                </tr>
              )}

              {docs.map((d, idx) => {
                const latestShare = d.shares[0];

                return (
                  <tr
                    key={d.id}
                    className={[
                      "text-sm",
                      idx % 2 ? "bg-white/[0.01]" : "bg-transparent",
                      "hover:bg-white/[0.03] transition-colors",
                    ].join(" ")}
                  >
                    {/* File + rename + log link */}
                    <td className="px-4 py-3">
                      {latestShare ? (
                        <a
                          href={`/doc/${latestShare.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {d.filename}
                        </a>
                      ) : (
                        <span className="text-gray-300">{d.filename}</span>
                      )}

                      {/* Rename inline */}
                      <form action={renameDocument} className="mt-2 flex items-center gap-2">
                        <input type="hidden" name="documentId" value={d.id} />
                        <input
                          name="filename"
                          defaultValue={d.filename}
                          className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs w-[280px]"
                        />
                        <button className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10">
                          Rename
                        </button>
                      </form>

                      {/* View log */}
                      <div className="mt-2">
                        <a
                          href={`/admin/documents/${d.id}`}
                          className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                        >
                          View log
                        </a>
                      </div>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(d.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>

                    {/* Shares count */}
                    <td className="px-4 py-3 text-gray-300">{d.shares.length}</td>

                    {/* Actions */}
                    <td className="px-4 py-3 space-y-3">
                      {/* Open viewer (creates a share if none yet) */}
                      <form action={openWithWatermark} className="inline">
                        <input type="hidden" name="documentId" value={d.id} />
                        <button className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10">
                          {latestShare ? "Open" : "Open (create share)"}
                        </button>
                      </form>

                      {/* Create share */}
                      <form action={createShare} className="flex items-center gap-2">
                        <input type="hidden" name="documentId" value={d.id} />
                        <input
                          type="email"
                          name="email"
                          placeholder="Share to email"
                          className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs"
                          required
                        />
                        <button className="rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs hover:bg-white/10">
                          Create share
                        </button>
                      </form>

                      {/* Shares list with edit/revoke */}
                      {d.shares.length > 0 && (
                        <div className="space-y-2">
                          {d.shares.map((s) => (
                            <div
                              key={s.id}
                              className="flex flex-wrap items-center gap-2 text-xs text-gray-300"
                            >
                              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                                {s.recipientEmail}
                              </span>
                              <span className="text-gray-500">•</span>
                              <code className="bg-white/5 px-1.5 py-0.5 rounded">
                                {s.id.slice(0, 8)}…
                              </code>

                              <a
                                href={`/doc/${s.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10"
                              >
                                Open
                              </a>

                              {s.canDownload ? (
                                <a
                                  href={`/doc/${s.id}/download?download=1`}
                                  className="rounded-md bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10"
                                >
                                  Download (watermarked)
                                </a>
                              ) : (
                                <span className="rounded-md bg-white/5 border border-white/10 px-2 py-1 opacity-60 cursor-not-allowed">
                                  Download disabled
                                </span>
                              )}

                              {/* Toggle download */}
                              <form action={toggleShareDownload} className="inline">
                                <input type="hidden" name="shareId" value={s.id} />
                                <input type="hidden" name="allow" value={(!s.canDownload).toString()} />
                                <button className="rounded-md bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10">
                                  {s.canDownload ? "Disable downloads" : "Enable downloads"}
                                </button>
                              </form>

                              {/* Status pill */}
                              <span
                                className={`px-1.5 py-0.5 rounded border ${
                                  s.canDownload
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                                }`}
                              >
                                {s.canDownload ? "can download" : "view only"}
                              </span>

                              {/* Expiry editor */}
                              <form action={updateShareExpiry} className="flex items-center gap-1">
                                <input type="hidden" name="shareId" value={s.id} />
                                <input
                                  type="datetime-local"
                                  name="expiresAt"
                                  defaultValue={dtLocalValue(s.expiresAt)}
                                  className="rounded bg-white/5 border border-white/10 px-2 py-1"
                                  style={{ width: 240 }}
                                />
                                <button className="rounded-md bg-white/5 border border-white/10 px-2 py-1 hover:bg-white/10">
                                  Save expiry
                                </button>
                              </form>

                              {/* Revoke share (uses client confirm helper) */}
                              <form id={`revoke-${s.id}`} action={revokeShare} className="hidden">
                                <input type="hidden" name="shareId" value={s.id} />
                              </form>
                              <ConfirmSubmit
                                formId={`revoke-${s.id}`}
                                label="Revoke"
                                message="Revoke this share? Recipients will lose access."
                                className="rounded-md border border-rose-400/30 bg-rose-500/15 text-rose-300 px-2 py-1 hover:bg-rose-500/25"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}