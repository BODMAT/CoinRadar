import { Request } from "express";

// Extend the standard Request interface with userId from auth middleware.
declare module "express" {
  export interface Request {
    userId?: string;
  }
}
