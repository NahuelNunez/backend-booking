import type { NextFunction, Request, Response } from "express";
import * as businessService from "../services/business.service.js";
import type { RegisterBusinessInput } from "../validators/business.validator.js";

export const registerBusiness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Body has already been parsed by validateBody(registerBusinessSchema).
    const result = await businessService.registerBusiness(req.body as RegisterBusinessInput);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
