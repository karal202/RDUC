import express from "express";
import licenseRouter from "./license.router.js";

const rootRouter = express.Router();

rootRouter.use("/license", licenseRouter);

export default rootRouter;
