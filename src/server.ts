import { Server } from "http";
import app from "./app";
import { config } from "./config/config";
import prisma from "./shared/prisma";
import { initializeSocketServer, closeSocketServer } from "./socket/socketHandler";

let server: Server;

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");

    server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);

      // Initialize Socket.io
      initializeSocketServer(server);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

process.on("unhandledRejection", async (error) => {
  console.error("Unhandled rejection, shutting down:", error);
  await closeSocketServer();
  if (server) server.close(() => process.exit(1));
});

process.on("uncaughtException", async (error) => {
  console.error("Uncaught exception, shutting down:", error);
  await closeSocketServer();
  process.exit(1);
});
