import { z } from "zod";
import {
  isValidPhone,
  isValidSirenSiret,
  onboardingMessage,
} from "./useOnboardingState";

const err = (key: string) => ({ error: () => onboardingMessage(key) });

export const profileSchema = z
  .object({
    firstName: z.string().trim().min(1, err("firstName")),
    lastName: z.string().trim().min(1, err("lastName")),
    phoneCountryCode: z.string().optional(),
    phone: z
      .string()
      .trim()
      .min(1, err("phone"))
      .refine(isValidPhone, err("phone")),
    address: z.string(),
    addressNote: z.string(),
    isPersonalAgency: z.boolean().default(false),
    agencyName: z.string().trim().min(1, err("agencyName")),
    legalForm: z.string().default(""),
    sirenSiret: z.string().default(""),
    agencyAddress: z.string().default(""),
  })
  .superRefine((data, ctx) => {
    if (
      !data.isPersonalAgency &&
      data.sirenSiret &&
      !isValidSirenSiret(data.sirenSiret)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sirenSiret"],
        message: onboardingMessage("sirenSiret"),
      });
    }
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ProfileFormInput = z.input<typeof profileSchema>;
