import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const trimmed = id?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const strategy = await prisma.strategy.findFirst({
      where: {
        id: trimmed,
        userId: user.id,
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    return NextResponse.json({ data: strategy });
  } catch (error) {
    console.error("Failed to load strategy", error);
    return NextResponse.json({ error: "Unable to load strategy." }, { status: 500 });
  }
}
