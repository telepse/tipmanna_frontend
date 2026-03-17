import * as z from "zod";

// const eventCodeRegex = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/* --------------------------------
   ENUMS (mirroring Prisma enums)
----------------------------------*/

export const UserRoleEnum = z.enum(["HOST", "TIPPER"]);

export const EventTypeEnum = z.enum([
  "CONCERT_MUSIC",
  "DRAMA_ART",
  "FESTIVAL",
  "FOOD",
  "HANG_OUT",
  "ISLAMIC",
  "CHRISTIAN",
  "CORPORATE",
  "COMEDY",
  "FASHION",
  "GAME_SPORT",
  "OTHER",
]);

export const CustomerTypeEnum = z.enum(["INDIVIDUAL", "ORGANIZATION"]);
export const HasPhysicalLocationEnum = z.enum(["YES", "NO"]);

export const EventActivityEnum = z.enum([
  "COMEDY",
  "GAMES",
  "PRAYING",
  "DRAWING",
  "DANCING",
  "STAGE_SHOW",
]);

export const ResourceRequestEnum = z.enum([
  "EMAIL_BLAST_TO_ATTENDEES",
  "EVENT_QR_CODE_PRINTS",
  "SCREEN_DISPLAY_SUPPORT",
  "TIPMANNA_AGENTS_AT_VENUE",
]);

export const TipUsageEnum = z.enum([
  "PERFORMER_WELFARE",
  "HOST_WELFARE",
  "COHOST_WELFARE",
]);

/* --------------------------------
   EVENT SCHEMA
----------------------------------*/

export const eventSchema = z.object({
  // 🟢 Basic Info
  eventName: z.string().min(3, "Event name is required"),
  customerType: CustomerTypeEnum.or(z.literal("")),

  eventDescription: z
    .string()
    .min(3, "Event description is required")
    .max(50, "Event description should be less than 50 characters"),

  // Conditional fields based on customerType
  organizationName: z.string().optional(),
  registrationNumber: z.string().optional(),
  niNumber: z.string().optional(),

  // Conditional fields based on customerType
  firstName: z.string().optional(),
  lastName: z.string().optional(),

  hostName: z.string().min(2, "Host name is required"),
  eventType: EventTypeEnum.or(z.literal("")),
  eventDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),

  // 🏛️ Venue
  venueName: z.string().min(2, "Venue name is required"),
  venueLocation: z.string().min(2, "Venue location is required"),
  activities: z
    .array(EventActivityEnum)
    .nonempty("Select at least one activity"),

  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().min(2, "Postal code is required"),

  // 👥 Cohosts
  cohosts: z
    .array(
      z.object({
        email: z.string().email("Invalid cohost email"),
      })
    )
    .optional(),

  // 🕒 Sessions extra fields for UI logic
  dividedIntoSessions: z.boolean().optional(),
  multiAmount: z.boolean().optional(),
  defaultAmount: z.number().nonnegative().optional(),

  // 🕒 Sessions
  sessions: z
    .array(
      z.object({
        title: z.string().min(1, "Session title is required"),
        description: z.string().optional(),
        startTime: z.string().min(1, "Session start time is required"),
        endTime: z.string().min(1, "Session end time is required"),
        amountToRaise: z.number().nonnegative().optional(),
      })
    )
    .optional(),

  // 🎤 Performers
  performers: z
    .array(
      z.object({
        name: z.string().min(1, "Performer name is required"),
        email: z.string().min(1, "Performer email is required"),
      })
    )
    .optional(),

  // 🔗 Live Video
  liveVideoLink: z.string().optional(),

  // 🖼️ Event Banner
  eventBanner: z.string().optional(),

  // 💰 Finance
  resourcesRequested: z.array(ResourceRequestEnum).optional(),

  amountToRaise: z
    .number()
    .positive("Amount must be greater than zero")
    .refine(val => !isNaN(val), { message: "Amount must be a valid number" })
    .refine(val => val !== undefined, {
      message: "Amount to raise is required",
    }),

  bankAccountDetails: z.string().min(10, "Bank account details are required"),

  // 💡 Tip usage disclosure
  tipUsageDisclosure: z
    .array(
      z.object({
        usageType: TipUsageEnum,
        percentage: z
          .number()
          .min(0, "Percentage cannot be negative")
          .max(100, "Percentage cannot exceed 100"),
      })
    )
    .optional(),
});

export const newEventSchema = z.object({
  // 🟢 Basic Info
  eventName: z.string().min(3, "Event name is required"),
  hasPhysicalLocation: HasPhysicalLocationEnum.or(z.literal("")),
  customerType: CustomerTypeEnum.or(z.literal("")),

  // 📼 Video links
  videoLinks: z
    .array(
      z.object({
        url: z.string().url("Enter a valid URL"),
        title: z.string().min(1, "Video title is required"),
        reminders: z.array(z.number().min(0)).optional(), // optional array of numbers
        isDefault: z.boolean().default(false),
      })
    )
    .optional(),

  eventDescription: z.string().optional(),

  // Conditional fields based on customerType
  organizationName: z.string().optional(),

  // Conditional fields based on customerType
  firstName: z.string().optional(),
  lastName: z.string().optional(),

  hostName: z.string(),
  eventType: EventTypeEnum.or(z.literal("")),
  eventDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),

  // 🏛️ Venue
  venueName: z.string().optional(),
  venueLocation: z.string().optional(),
  activities: z.array(EventActivityEnum).optional(),

  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),

  // 👥 Cohosts
  cohosts: z
    .array(
      z.object({
        fullname: z.string(),
        email: z.string().email("Invalid cohost email"),
      })
    )
    .optional(),

  // 🕒 Sessions extra fields for UI logic
  dividedIntoSessions: z.boolean().optional(),
  multiAmount: z.boolean().optional(),
  defaultAmount: z.number().nonnegative().optional(),

  // 🕒 Sessions
  sessions: z
    .array(
      z.object({
        title: z.string().min(1, "Session title is required"),
        description: z.string().optional(),
        startTime: z.string().min(1, "Session start time is required"),
        endTime: z.string().min(1, "Session end time is required"),
        amountToRaise: z.number().nonnegative().optional(),
      })
    )
    .optional(),

  // 🎤 Performers
  performers: z
    .array(
      z.object({
        name: z.string().min(1, "Performer name is required"),
        email: z.string().min(1, "Performer email is required"),
      })
    )
    .optional(),

  // 🔗 Live Video
  liveVideoLink: z.string().optional(),

  // 🖼️ Event Banner
  eventBanner: z.string().optional(),

  // 💰 Finance
  resourcesRequested: z.array(ResourceRequestEnum).optional(),

  amountToRaise: z
    .number()
    .positive("Amount must be greater than zero")
    .refine(val => !isNaN(val), { message: "Amount must be a valid number" })
    .refine(val => val !== undefined, {
      message: "Amount to raise is required",
    }),

  // 💡 Tip usage disclosure
  tipUsageDisclosure: z
    .array(
      z.object({
        usageType: z.enum([
          "PERFORMER_WELFARE",
          "HOST_WELFARE",
          "COHOST_WELFARE",
          "CUSTOM",
        ]),
        customLabel: z.string().min(1, "Label is required"),
        percentage: z.number().min(0).max(100),
        enabled: z.boolean(),
      })
    )
    .min(1, "At least one tip allocation is required")
    .superRefine((items, ctx) => {
      const enabledItems = items.filter(i => i.enabled);

      if (enabledItems.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one tip allocation must be enabled",
        });
        return;
      }

      const total = enabledItems.reduce(
        (sum, item) => sum + item.percentage,
        0
      );

      if (total !== 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enabled tip allocations must total exactly 100%",
        });
      }
    }),
});

export const editProfileSchema = z.object({
  username: z.string().min(2, "Username is required"),
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email"),
});

export const profileFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.email("Invalid email address"),
  password: z.string(),
  confirmPassword: z.string(),
});

export const GenderTypeEnum = z.enum(["MALE", "FEMALE"]);

export const individualProfileFormSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  homeAddress: z.string().min(2, "Home address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State or county is required"),
  postalCode: z.string().min(2, "Postal code is required"),
  niNumber: z.string().min(2, "National insurance number is required"),
  dateOfBirth: z.string().min(2, "Date of birth is required"),
  gender: GenderTypeEnum.or(z.literal("")),
  accountName: z.string().min(2, "Account name must be same as legal name"),
  accountNumber: z.string().min(2, "Account number is required"),
  sortCode: z.string().min(2, "Sort code is required"),
});

export const organisationProfileFormSchema = z.object({
  registeredCompanyName: z
    .string()
    .min(2, "Registered company name is required"),
  companyRegistrationNumber: z
    .string()
    .min(2, "Company registration number is required"),
  registeredAddress: z.string().min(2, "Registered address"),
  uniqueTaxpayerReference: z
    .string()
    .min(2, "Unique tax payer reference is required"),
  vatRegistrationNumber: z.string().min(2, "VAT registration number"),
  invoice: z.string().min(2, "Invoice is required"),
  accountName: z
    .string()
    .min(2, "Business account name must be same as legal name"),
  accountNumber: z.string().min(2, "Business account number is required"),
  sortCode: z.string().min(2, "Business sort code is required"),
  businessBankAccountDetails: z
    .string()
    .min(2, "Business bank account details is required"),
});

export const paymentFormSchema = z.object({
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
  routingNumber: z.string(),
  accountHolderName: z.string().min(2, "Account holder name is required"),
  taxId: z.string().min(2, "Tax ID is required"),
  businessType: z.string().min(2, "Business type is required"),
  payoutFrequency: z.string().min(2, "Payout frequency is required"),
});

export const screenSettingsFormSchema = z.object({
  backgroundUrl: z.string(),
  moneyFor: z.string(),
  showLatest: z.boolean(),
  showAmountOnProgressBar: z.boolean(),
});

export type EventFormData = z.infer<typeof eventSchema>;
export type NewEventFormData = z.infer<typeof newEventSchema>;

export type EditProfileFormData = z.infer<typeof editProfileSchema>;

export type profileFormData = z.infer<typeof profileFormSchema>;
export type individualProfileFormData = z.infer<
  typeof individualProfileFormSchema
>;
export type organisationProfileFormData = z.infer<
  typeof organisationProfileFormSchema
>;
export type paymentFormData = z.infer<typeof paymentFormSchema>;

export type ScreenSettingsFormData = z.infer<typeof screenSettingsFormSchema>;
