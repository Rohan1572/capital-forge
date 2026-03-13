import { NextResponse } from "next/server";
import { getActiveShock } from "@/lib/shocks";

export async function GET() {
  try {
    const shock = await getActiveShock();
    return NextResponse.json({ data: { shock } });
  } catch (error) {
    console.error("Failed to load active shock", error);
    return NextResponse.json({ error: "Unable to load active shock." }, { status: 500 });
  }
}
