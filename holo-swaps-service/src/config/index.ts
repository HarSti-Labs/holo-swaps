import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
//   "STRIPE_SECRET_KEY",
//   "STRIPE_WEBHOOK_SECRET",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const config = {
  server: {
    port: parseInt(process.env.PORT || "4000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    isDev: process.env.NODE_ENV === "development",
  },
  db: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  tcgapis: {
    apiKey: process.env.TCGAPIS_API_KEY || "",
    apiUrl: process.env.TCGAPIS_API_URL || "https://api.tcgapis.com/v1",
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceKey: process.env.SUPABASE_SERVICE_KEY || "",
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:3000",
  },
  aftership: {
    apiKey: process.env.AFTERSHIP_API_KEY || "",
    webhookSecret: process.env.AFTERSHIP_WEBHOOK_SECRET || "",
    apiUrl: "https://api.aftership.com/v4",
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "Holo Swaps <noreply@holoswaps.com>",
  },
};
