import { Router } from "express";
import { businessRouter } from "./business.routes.js";

export const apiRouter = Router();

apiRouter.use("/businesses", businessRouter);
