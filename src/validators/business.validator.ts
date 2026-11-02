import { z } from "zod";

// Tenants live at tuapp.com/<slug>, so these must stay free for the app's own routes.
const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "login",
  "logout",
  "register",
  "signup",
  "dashboard",
  "assets",
  "static",
  "health",
  "help",
  "support",
  "terms",
  "privacy",
  "pricing",
  "settings",
]);

// DateTimeFormat accepts aliases (e.g. America/Argentina/Buenos_Aires) that
// Intl.supportedValuesOf omits; Postgres accepts them too.
const isValidTimezone = (timeZone: string): boolean => {
  // DateTimeFormat also accepts offsets like +01:00, but Postgres reads those
  // as POSIX zones with the sign flipped, which would shift the shop's hours.
  if (/^[+-]/.test(timeZone)) {
    return false;
  }

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
    // Normalize first: z.email() checks the raw value, so it would reject stray spaces.
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
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
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Use a two-letter country code, e.g. AR")
      .optional(),
    phoneE164: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{6,14}$/, "Use international format, e.g. +5491122334455")
      .optional(),
  }),
});

export type RegisterBusinessInput = z.infer<typeof registerBusinessSchema>;
