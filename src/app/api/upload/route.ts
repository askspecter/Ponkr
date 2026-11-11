import { pinFile } from "@/lib/server/ipfs";
import { clientIp, consume } from "@/lib/server/accounts";
import { err, handle, json } from "@/lib/server/http";

export async function POST(req: Request) {
  return handle(async () => {
    if (!consume("upload", clientIp(req), 30).ok) return err("Upload limit reached", 429);
    const fd = await req.formData();
    const f = fd.get("file");
    if (!(f instanceof Blob)) return err("Missing file");
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(f.type)) return err("Image must be PNG, JPEG, GIF or WebP");
    if (f.size > 5 * 1024 * 1024) return err("Image too large (max 5MB)");
    const uri = await pinFile(f, (f as File).name || "logo");
    return json({ uri });
  });
}
