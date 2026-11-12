import { readPortalSession } from "@/lib/upstream";

const allowedHost = "zetexa-dev-media-files.s3.ap-south-1.amazonaws.com";
const extensionType: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function imageType(header: string, pathname: string) {
  const declared = header.split(";")[0].trim().toLowerCase();
  if (declared.startsWith("image/")) return declared;
  const extension = pathname.slice(pathname.lastIndexOf(".")).toLowerCase();
  return extensionType[extension] || "";
}

export async function GET(request: Request) {
  const { session, apiKey } = await readPortalSession();
  if (!session || !apiKey) {
    return Response.json({ message: "Sign in required." }, { status: 401 });
  }

  const raw = new URL(request.url).searchParams.get("url") || "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return Response.json({ message: "Image address is invalid." }, { status: 400 });
  }
  if (target.protocol !== "https:" || target.hostname !== allowedHost) {
    return Response.json({ message: "Image host is not allowed." }, { status: 400 });
  }

  try {
    const response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return Response.json({ message: "Image could not be loaded." }, { status: 502 });
    }
    const type = imageType(response.headers.get("content-type") || "", target.pathname);
    if (!type) {
      return Response.json({ message: "Image could not be loaded." }, { status: 415 });
    }
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return Response.json({ message: "Image could not be loaded." }, { status: 504 });
  }
}
