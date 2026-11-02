import { z } from "zod";

const RESERVED_SLUGS = new Set(["www", "api", "admin", "app"]);

// DateTimeFormat accepts aliases (e.g. America/Argentina/Buenos_Aires) that
// Intl.supportedValuesOf omits; Postgres accepts them too.
const isValidTimezone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

const optionalText = z.string().trim().max(200).optional();

export const registerBusinessSchema = z.object({
  owner: z.object({
    fullName: z.string().trim().min(1, "Full name is required").max(100),
    email: z.email("Enter a valid email").trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    takesAppointments: z.boolean(),
  }),
  business: z.object({
    name: z.string().trim().min(1, "Business name is required").max(100),
    slug: z
      .string()
      .trim()
      .min(3, "URL must be at least 3 characters")
      .max(40)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes")
      .refine((slug) => !RESERVED_SLUGS.has(slug), "This URL is reserved"),
  }),
  location: z.object({
    name: z.string().trim().min(1, "Location name is required").max(100),
    timezone: z.string().refine(isValidTimezone, "Unknown timezone"),
    currencyCode: z.enum(["USD", "ARS"]),
    addressLine1: optionalText,
    city: optionalText,
    countryCode: z.string().trim().toUpperCase().length(2).optional(),
    phoneE164: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +5491122334455")
      .optional(),
  }),
});

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
