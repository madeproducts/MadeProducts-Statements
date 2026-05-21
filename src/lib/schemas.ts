import { z } from "zod";

export const clientFormSchema = z.object({
  name: z.string().optional(),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const paymentFormSchema = z.object({
  clientId: z.string().uuid("Invalid client selection"),
  receivedAmount: z.number().positive("Payment amount must be a positive number"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid payment date selection",
  }),
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CHEQUE", "CASH"]),
  referenceNumber: z.string().optional(),
  receiptUrl: z.string().url("Invalid receipt URL").optional().or(z.literal("")),
  notes: z.string().optional(),
});
