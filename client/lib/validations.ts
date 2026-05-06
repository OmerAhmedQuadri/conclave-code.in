import { z } from "zod";

const phoneRegex = /^\+?[0-9\s-]{10,15}$/;

export const registrationSchema = z.object({
  parentName: z.string().min(2, "Please enter your full name").max(80, "Name is too long"),
  parentPhone: z.string().regex(phoneRegex, "Please enter a valid phone number"),
  studentName: z.string().min(2, "Please enter the student's name").max(80, "Name is too long"),
  studentAge: z.string().min(1, "Please select an age"),
  school: z.string().min(2, "Please enter the school or college name").max(120),
  city: z.string().min(2, "Please enter your city").max(60),
  referral: z.string().min(1, "Please tell us how you heard about us"),
  question: z
    .string()
    .max(500, "Please keep this under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type RegistrationFormValues = z.infer<typeof registrationSchema>;

export {
  requestInviteSchema,
  type RequestInviteInput as RequestInviteFormValues,
} from "@/models/request-invite";
