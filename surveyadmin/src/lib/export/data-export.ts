import type { NextApiRequest, NextApiResponse } from "next";

import nextConnect from "next-connect";
import { mongoExportMiddleware } from "~/lib/export/mongoExport";

export default nextConnect<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).end("Unknown error");
  },
}).get(
  // There is no auth anymore in surveyadmin as it is run locally only
  /*
  async function checkAuth(req, res: NextApiResponse, next) {
    // Same context is in graphql API
    const context = await contextFromReq(req);
    if (!context.currentUser?.isAdmin) {
      return res.status(401).end("Not authenticated as admin");
    }
    next();
  },
  */
  mongoExportMiddleware
);
