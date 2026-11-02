import { Router } from "express";
import { businessRouter } from "./business.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/businesses", businessRouter);
