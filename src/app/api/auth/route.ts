import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple password-based auth for admin
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "Password123!";

    if (password === adminPassword) {
      // Set a simple auth cookie
      const cookieStore = await cookies();
      cookieStore.set("admin-auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

// Check auth status
export async function GET() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("admin-auth")?.value === "true";

  return NextResponse.json({ authenticated: isAuthenticated });
}

// Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin-auth");

  return NextResponse.json({ success: true });
}
