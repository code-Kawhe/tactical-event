import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

const app = express();
// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);

// tRPC API
app.use(
  ["/api/trpc", "/api/trpc-handler"],
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
