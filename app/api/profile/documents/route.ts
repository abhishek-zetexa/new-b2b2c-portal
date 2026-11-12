import { asRecord } from "@/lib/portal-fetch";
import { publicEnv } from "@/lib/public-env";
import { upstreamData } from "@/lib/upstream";

function allowedDocumentUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^zetexa-ekyc-files\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

function extension(contentType: string) {
  if (contentType.includes("pdf")) return ".pdf";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return "";
}

function fileKind(bytes: Uint8Array, contentType: string) {
  const head = new TextDecoder().decode(bytes.slice(0, 12));
  if (head.startsWith("%PDF")) return { type: "application/pdf", ext: ".pdf" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { type: "image/png", ext: ".png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { type: "image/jpeg", ext: ".jpg" };
  if (head.startsWith("GIF8")) return { type: "image/gif", ext: ".gif" };
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return { type: "image/webp", ext: ".webp" };
  return { type: contentType || "application/octet-stream", ext: extension(contentType) };
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(key)) {
    return Response.json({ message: "Document is missing." }, { status: 400 });
  }

  const profile = await upstreamData(`${publicEnv.custConfig}reseller/profileInfo`);
  if (profile.status === 401) {
    return Response.json({ message: "Sign in required." }, { status: 401 });
  }
  if (profile.status >= 400) {
    return Response.json({ message: "Document is unavailable." }, { status: profile.status });
  }

  const data = asRecord(asRecord(profile.payload)?.profile_data);
  const documents = asRecord(data?.documents);
  const fileUrl = typeof documents?.[key] === "string" ? documents[key].trim() : "";
  if (!fileUrl || !allowedDocumentUrl(fileUrl)) {
    return Response.json({ message: "Document is unavailable." }, { status: 404 });
  }

  try {
    const file = await fetch(fileUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000) });
    if (!file.ok) {
      return Response.json({ message: "Document is unavailable." }, { status: 502 });
    }
    const contentType = file.headers.get("content-type") || "application/octet-stream";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = fileKind(bytes, contentType);
    return new Response(bytes, {
      headers: {
        "Content-Type": kind.type,
        "Content-Disposition": `attachment; filename="${key.toLowerCase()}${kind.ext}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ message: "Document is unavailable." }, { status: 502 });
  }
}
