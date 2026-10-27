import { z } from "zod";

const optionalText = z.string().max(2000).nullable().optional();
export const organizationEditSchema = z.object({
  org_id: z.string().uuid(),
  name: z.string().trim().min(1).max(300).optional(),
  email: z.string().trim().email().optional(),
  phone: optionalText, slogan: optionalText, address: optionalText,
  gov_reg_number: optionalText, is_gov_registered: z.boolean().optional(),
  logo_url: z.string().nullable().optional(),
  registration_certificate_url: z.string().nullable().optional(),
  pan_card_url: z.string().nullable().optional(),
  admin_aadhaar_url: z.string().nullable().optional(),
  bank_account_number: optionalText, bank_ifsc: optionalText,
  bank_name: optionalText, bank_branch: optionalText, bank_account_holder: optionalText,
  admin_name: optionalText, admin_designation: optionalText,
  founders: z.array(z.object({
    name: z.string().trim().min(1).max(300),
    address: z.string().max(2000).optional(),
    aadhaar_url: z.string().optional(),
  })).max(100).optional(),
});
export type OrganizationEdit = z.infer<typeof organizationEditSchema>;
export type OrganizationForm = Omit<OrganizationEdit, "org_id">;
export const organizationEditFields = Object.keys(organizationEditSchema.shape).filter((key) => key !== "org_id") as (keyof OrganizationForm)[];

export function organizationFormFromRow(row: Record<string, unknown>): OrganizationForm {
  const form: Record<string, unknown> = {};
  for (const key of organizationEditFields) {
    if (key === "founders") {
      form[key] = Array.isArray(row[key]) ? row[key] : [];
    } else if (key === "is_gov_registered") {
      form[key] = row[key] ?? true;
    } else {
      form[key] = row[key] ?? "";
    }
  }
  return form as OrganizationForm;
}