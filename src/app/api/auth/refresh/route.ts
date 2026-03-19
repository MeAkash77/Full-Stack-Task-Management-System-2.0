import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateAccessToken, verifyRefreshToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token required" },
        { status: 401 }
      );
    }

    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || typeof decoded === 'string' || !decoded.userId) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 403 }
      );
    }

    // Find user and verify the token matches what's stored
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 403 }
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id);

    return NextResponse.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}