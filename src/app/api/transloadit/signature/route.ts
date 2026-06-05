import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

  if (!authKey || !authSecret) {
    return NextResponse.json(
      { error: "Transloadit is not configured" },
      { status: 500 }
    );
  }

  const expires = new Date(Date.now() + 3600000).toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const params = {
    auth: {
      key: authKey,
      expires,
    },
    template_id: "",
    steps: {
      ":original": {
        robot: "/upload/handle",
      },
      exported: {
        use: ":original",
        robot: "/image/resize",
        width: 2048,
        height: 2048,
        resize_strategy: "fit",
        format: "jpg",
        result: true,
      },
    },
  };

  const paramsJson = JSON.stringify(params);
  const signature = crypto
    .createHmac("sha384", authSecret)
    .update(paramsJson)
    .digest("hex");

  return NextResponse.json({
    params: paramsJson,
    signature,
    authKey,
  });
}
