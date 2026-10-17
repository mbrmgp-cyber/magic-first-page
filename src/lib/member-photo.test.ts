import { expect, it, vi } from "vitest";
import { resolveMemberPhoto } from "./member-photo";

it("signs a committee member's private photo path instead of rendering the raw path", async () => {
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.org/signed-photo" }, error: null });
  const from = vi.fn().mockReturnValue({ createSignedUrl });
  expect(await resolveMemberPhoto({ storage: { from } }, "admin/org/member/photo.png")).toBe("https://example.org/signed-photo");
  expect(from).toHaveBeenCalledWith("member-photos");
  expect(createSignedUrl).toHaveBeenCalledWith("admin/org/member/photo.png", 3600);
});

it("does not expose a raw path when the caller cannot read a photo", async () => {
  const client = { storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: new Error("Forbidden") }) }) } };
  expect(await resolveMemberPhoto(client, "request/private/photo.jpg")).toBeNull();
});