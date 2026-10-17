type PhotoStorage = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, seconds: number) => PromiseLike<{
        data: { signedUrl: string } | null;
        error: unknown;
      }>;
    };
  };
};

/** Resolve private photo paths using the caller's storage permissions. */
export async function resolveMemberPhoto(client: PhotoStorage, photo: string | null | undefined) {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo) || photo.startsWith("data:image/")) return photo;
  const { data, error } = await client.storage.from("member-photos").createSignedUrl(photo, 3600);
  return error ? null : data?.signedUrl ?? null;
}