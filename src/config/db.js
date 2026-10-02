import dns from "dns";
import mongoose from "mongoose";
import { env } from "./env.js";

// Prefer IPv4 — avoids common Windows DNS / Atlas SRV lookup failures
dns.setDefaultResultOrder("ipv4first");

let memoryServer = null;

// Cache connection across Vercel serverless invocations
let cached = globalThis.__prMongo;
if (!cached) {
  cached = globalThis.__prMongo = { conn: null, promise: null };
}

function isPlaceholderUri(uri) {
  return (
    !uri ||
    uri.includes("example.mongodb.net") ||
    uri.includes("your_username") ||
    uri.includes("your_password")
  );
}

export async function connectDB() {
  mongoose.set("strictQuery", true);

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  let uri = env.mongodbUri;
  const useMemory =
    env.useMemoryDb || (env.nodeEnv === "development" && isPlaceholderUri(uri));

  if (useMemory) {
    if (process.env.VERCEL) {
      throw new Error(
        "USE_MEMORY_DB cannot be used on Vercel. Set a real MONGODB_URI (Atlas).",
      );
    }
    // Dev-only dependency — keep out of production bundle
    const { MongoMemoryReplSet } = await import("mongodb-memory-server");
    // Invitations atomically update the user and invite in one transaction.
    memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = memoryServer.getUri("propertyreply");
    console.log("Using in-memory MongoDB for local development");
    console.log("(Set a real MONGODB_URI in .env to use MongoDB Atlas instead)");
  } else if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Add it to backend/.env or set USE_MEMORY_DB=true",
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .then((mongooseInstance) => {
        console.log("MongoDB connected");
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        throw new Error(
          `MongoDB connection failed: ${err?.message || err}. Check MONGODB_URI and Atlas Network Access (allow 0.0.0.0/0 for Vercel).`,
        );
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cached.conn = null;
  cached.promise = null;
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
