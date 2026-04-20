import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response, Request } from "express";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(6),
  country: z.string().min(2),
  countryCode: z.string(),
  role: z.enum(["founder", "collaborator", "investor", "organisation"]),
});

// POST /api/auth/signup
authRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    const body = signupSchema.parse(req.body);

    // Create auth user via Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError) throw new AppError(400, authError.message);

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      email: body.email,
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone,
      country: body.country,
      country_code: body.countryCode,
      role: body.role,
      credit_balance: 250,
      credibility_score: 0,
      is_verified: false,
      is_onboarded: false,
      skills: [],
      industries: [],
      secondary_roles: [],
      investment_focus: [],
      certifications: [],
    });

    if (profileError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError(500, "Failed to create profile");
    }

    // Sign in to get session tokens
    const { data: session, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (sessionError) throw new AppError(400, sessionError.message);

    res.status(201).json({
      message: "Account created successfully",
      user: { id: userId, email: body.email, role: body.role },
      session: session.session,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof z.ZodError) {
      throw new AppError(400, "Validation error: " + err.errors.map((e: any) => e.message).join(", "));
    }
    throw err;
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) throw new AppError(401, "Invalid email or password");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    res.json({
      user: data.user,
      session: data.session,
      profile,
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof z.ZodError) throw new AppError(400, "Validation error: " + err.errors.map((e: any) => e.message).join(", "));
    throw err;
  }
});

// POST /api/auth/logout
authRouter.post("/logout", authenticate, async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (token) {
    await supabaseAdmin.auth.admin.signOut(token);
  }
  res.json({ message: "Logged out successfully" });
});

// GET /api/auth/me
authRouter.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", req.userId!)
    .single();

  if (!profile) throw new AppError(404, "Profile not found");
  res.json(profile);
});
