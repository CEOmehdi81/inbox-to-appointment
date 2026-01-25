import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-ingest-token",
};

const IntakeSchema = z.object({
  channel: z.enum(["whatsapp", "instagram"]),
  external_thread_id: z.string().min(1),
  role: z.enum(["user", "assistant"]).default("user"),
  text: z.string().min(1),
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
    // 1. Auth (soft, only enforced if token is configured)
    debug.step = "auth";

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

    if (expected && token !== expected) {
      debug.step = "unauthorized";
      debug.expected_len = expected.length;
      debug.received_len = token.length;

      return unauthorized({
        expected_len: expected.length,
        received_len: token.length,
        has_auth_header: !!bearer,
        has_x: !!xHeader,
        has_q: !!q,
      });
    }

    // 2. Parse body
    debug.step = "parse_json";
    let bodyUnknown: unknown;

    try {
      bodyUnknown = await req.json();
    } catch {
      debug.step = "invalid_json";
      return NextResponse.json(
        { ok: false, error: "invalid_json", debug },
        { status: 200, headers: corsHeaders },
      );
    }

    // 3. Validate payload
    debug.step = "zod_parse";
    const parsed = IntakeSchema.safeParse(bodyUnknown);

    if (!parsed.success) {
      debug.step = "validation_error";
      debug.validation = parsed.error.format();

      return NextResponse.json(
        {
          ok: false,
          error: "validation_error",
          details: parsed.error.format(),
          debug,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    const { channel, external_thread_id, role, text, person_id } =
      parsed.data;

    // 4. Find or create conversation
    debug.step = "find_or_create_conversation";
    debug.channel = channel;
    debug.external_thread_id = external_thread_id;

    let conversation = await prisma.conversation.findFirst({
      where: { channel, external_thread_id },
    });

    if (!conversation) {
      debug.substep = "create_conversation";

      conversation = await prisma.conversation.create({
        data: {
          channel,
          external_thread_id,
          ...(person_id ? { person_id } : {}),
        },
      });
    } else if (person_id && !conversation.person_id) {
      debug.substep = "update_person_id";

      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { person_id },
      });
    }

    // 5. Insert message
    debug.step = "insert_message";

    const msg = await prisma.conversationMessage.create({
      data: {
        conversation_id: conversation.id,
        role,
        text,
      },
    });

    debug.step = "done";
    debug.conversation_id = conversation.id;
    debug.message_id = msg.id;

    console.log("[CONVERSATION_INTAKE ok]", {
      conversation_id: conversation.id,
      message_id: msg.id,
    });

    return NextResponse.json(
      {
        ok: true,
        conversation_id: conversation.id,
        message_id: msg.id,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (err: any) {
    console.error("[CONVERSATION_INTAKE] fatal error", {
      err: String(err),
      stack: err?.stack,
      debug,
    });

    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        debug,
      },
      { status: 200, headers: corsHeaders },
    );
  }
}