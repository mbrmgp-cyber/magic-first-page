import { describe, expect, it, vi } from "vitest";
import { readPointProfiles } from "./varadhi-points-overview.server";

const profile = { user_id: "user-1", full_name: "Registered user", city: "Village", state: "Andhra Pradesh", district: "Tirupati", mandal: "Chitvel" };
function client(error?: { message: string }) {
  let validColumns = false;
  const filters: Record<string, string> = {};
  const query: any = {
    select: vi.fn((columns: string) => {
      validColumns = columns.split(",").map(c => c.trim()).includes("city") && !columns.split(",").map(c => c.trim()).includes("village");
      return query;
    }),
    limit: () => query,
    eq: (key: string, value: string) => { filters[key] = value; return query; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({
      error: error ?? (validColumns ? null : { message: "column village does not exist" }),
      data: validColumns && Object.entries(filters).every(([key, value]) => profile[key as keyof typeof profile] === value) ? [profile] : [],
    })),
  };
  return { from: () => query };
}

describe("points overview registered profiles", () => {
  it("reads the saved village from city instead of querying a nonexistent column", async () => {
    expect(await readPointProfiles(client(), {})).toEqual([profile]);
  });
  it("keeps registered users visible when searching their state, district and mandal", async () => {
    expect(await readPointProfiles(client(), { state: "Andhra Pradesh", district: "Tirupati", mandal: "Chitvel" })).toEqual([profile]);
    expect(await readPointProfiles(client(), { district: "Kadapa" })).toEqual([]);
  });
  it("reports read failures instead of showing zero registered users", async () => {
    await expect(readPointProfiles(client({ message: "read failed" }), {})).rejects.toThrow("read failed");
  });
});