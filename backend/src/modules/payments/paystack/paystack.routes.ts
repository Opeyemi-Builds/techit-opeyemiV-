import { Router } from "express";
import { initializePaystack } from "./paystack.controller";

const router = Router();

router.post("/initialize", initializePaystack);

export default router;