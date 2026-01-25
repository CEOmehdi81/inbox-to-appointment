import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-ingest-token",
};

const UpdateSchema = z.object({
  // identification: either conversation_id, or (channel + external_thread_id)
  conversation_id: z.string().optional(),
  channel: z.enum(["whatsapp", "instagram"]).optional(),
  external_thread_id: z.string().optional(),

  status: z.string().optional(),
  last_stage: z.string().optional(),
  last_score: z.number().optional(),
  last_snapshot_json: z.any().optional(),
  person_id: z.string().optional().nullable(),
});

function unauthorized(debug?: unknown) {
  const body =
    process.env.NODE_ENV === "development"
      ? { ok: false, error: "unauthorized", debug }
      : { ok: false, error: "unauthorized" };

  return NextResponse.json(body, { status: 401, headers: corsHeaders });
}

export function OPTIONS() {
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const debug: any = { step: "start" };

  try {
    const expected = (
      process.env.INGEST_TOKEN ||
      process.env.NEXT_PUBLIC_INGEST_TOKEN ||
      ""
    ).trim();

    const authRaw = (req.headers.get("authorization") || "").trim();
    const xHeader = (req.headers.get("x-ingest-token") || "").trim();
    const q = new URL(req.url).searchParams.get("token")?.trim() || "";

    const bearer = authRaw.startsWith("Bearer ")
      ? authRaw.slice(7).trim()
      : "";
    const token = bearer || xHeader || q || "";

    if (!expected || token !== expected) {
      return unauthorized({
        expected_len: expected.length,
        received_len: token.length,
        has_auth_header: !!bearer,
        has_x: !!xHeader,
        has_q: !!q,
      });
    }

    debug.step = "parse_json";
    let bodyUnknown: unknown;
    try {
      bodyUnknown = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 200, headers: corsHeaders },
      );
    }

    debug.step = "zod_parse";
    const parsed = UpdateSchema.safeParse(bodyUnknown);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "validation_error", details: parsed.error.format() },
        { status: 200, headers: corsHeaders },
      );
    }

    const data = parsed.data;

    debug.step = "find_conversation";
    let conversationId = data.conversation_id ?? null;

    if (!conversationId) {
      if (!data.channel || !data.external_thread_id) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "missing_identifier, provide conversation_id or channel + external_thread_id",
          },
          { status: 200, headers: corsHeaders },
        );
      }

      const conv = await prisma.conversation.findFirst({
        where: {
          channel: data.channel,
          external_thread_id: data.external_thread_id,
        },
      });

      if (!conv) {
        return NextResponse.json(
          { ok: false, error: "conversation_not_found" },
          { status: 200, headers: corsHeaders },
        );
      }

      conversationId = conv.id;
    }

    debug.step = "build_update";

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.last_stage !== undefined) updateData.last_stage = data.last_stage;
    if (data.last_score !== undefined) updateData.last_score = data.last_score;
    if (data.last_snapshot_json !== undefined)
      updateData.last_snapshot_json = data.last_snapshot_json;
    if (data.person_id !== undefined) updateData.person_id = data.person_id;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: "nothing_to_update" },
        { status: 200, headers: corsHeaders },
      );
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    return NextResponse.json(
      { ok: true, conversation_id: updated.id },
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("[CONVERSATION_UPDATE] fatal error", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 200, headers: corsHeaders },
    );
  }
}