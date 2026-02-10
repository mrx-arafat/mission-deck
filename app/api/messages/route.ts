import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || 'general';
    const since = searchParams.get('since');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 200);

    let rows;
    if (since) {
      rows = await sql`
        SELECT id, sender_id, sender_name, content, created_at, channel, type, task_ref, mentions
        FROM messages
        WHERE channel = ${channel} AND created_at > ${Number(since)}
        ORDER BY created_at ASC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT id, sender_id, sender_name, content, created_at, channel, type, task_ref, mentions
        FROM messages
        WHERE channel = ${channel}
        ORDER BY created_at ASC
        LIMIT ${limit}
      `;
    }

    const messages = rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      content: r.content,
      timestamp: Number(r.created_at),
      channel: r.channel,
      type: r.type,
      taskRef: r.task_ref || undefined,
      mentions: r.mentions || undefined,
    }));

    return NextResponse.json(messages);
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = Date.now();
    const id = `m-${now}-${Math.random().toString(36).slice(2, 6)}`;

    await sql`
      INSERT INTO messages (id, sender_id, sender_name, content, created_at, channel, type, task_ref, mentions)
      VALUES (${id}, ${body.senderId}, ${body.senderName}, ${body.content},
              ${now}, ${body.channel || 'general'}, ${body.type || 'message'},
              ${body.taskRef || null}, ${body.mentions || null})
    `;

    return NextResponse.json({
      id,
      senderId: body.senderId,
      senderName: body.senderName,
      content: body.content,
      timestamp: now,
      channel: body.channel || 'general',
      type: body.type || 'message',
      taskRef: body.taskRef || undefined,
      mentions: body.mentions || undefined,
    });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
