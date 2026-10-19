import { expect, it, vi } from "vitest";
import { readAdminOrgMembers } from "./admin-org-members.server";

function mockClient(pages: Array<{ data: unknown[] | null; error: { message: string } | null }>) {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  for (const page of pages) query.range.mockResolvedValueOnce(page);
  const client = { from: vi.fn().mockReturnValue(query) };
  return { client: client as unknown as Parameters<typeof readAdminOrgMembers>[0], query };
}

it("reports Chitvel's 10 approved members within the requested organization", async () => {
  const { client, query } = mockClient([{ data: Array.from({ length: 10 }, (_, id) => ({ id, status: "approved" })), error: null }]);
  const result = await readAdminOrgMembers(client, "chitvel-org");
  expect(query.eq).toHaveBeenCalledWith("org_id", "chitvel-org");
  expect(result.counts).toEqual({ total: 10, approved: 10, pending: 0, rejected: 0 });
  expect(result.members).toHaveLength(10);
});

it("does not disguise a failed member read as zero members", async () => {
  const { client } = mockClient([{ data: null, error: { message: "Member read failed" } }]);
  await expect(readAdminOrgMembers(client, "org")).rejects.toThrow("Member read failed");
});

it("includes every page and counts each member status separately", async () => {
  const { client, query } = mockClient([
    { data: Array.from({ length: 1000 }, () => ({ status: "approved" })), error: null },
    { data: [{ status: "pending" }, { status: "rejected" }], error: null },
  ]);
  expect((await readAdminOrgMembers(client, "org")).counts).toEqual({ total: 1002, approved: 1000, pending: 1, rejected: 1 });
  expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
});