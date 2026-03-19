import jwt from "jsonwebtoken";

// Use environment variables in production
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret_dev_only";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret_dev_only";

export function generateAccessToken(userId: string) {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}