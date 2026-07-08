import { z } from "zod";

export const inquirySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  phone: z.string().max(50).optional().or(z.literal("")),
  event_type: z.string().max(100).optional().or(z.literal("")),
  event_date: z.string().optional().or(z.literal("")),
  message: z.string().max(5000).optional().or(z.literal("")),
});

export type InquiryFormValues = z.infer<typeof inquirySchema>;
