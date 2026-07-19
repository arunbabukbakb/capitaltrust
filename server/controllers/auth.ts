import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { RoleModel } from '../models/Role';
import { sendPushNotification } from '../firebaseAdmin';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, username, password, phoneNumber } = req.body;
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: fullName, email, username, password" });
    }

    const emailLower = email.toLowerCase();
    const existing = await UserModel.findByUsernameOrEmail(username, null) || await UserModel.findByUsernameOrEmail(email, null);
    if (existing) {
      return res.status(400).json({ error: "Account with this email/username already exists" });
    }

    const usersCount = await UserModel.countAll();
    const isFirstUser = usersCount === 0;
    const initialRole = isFirstUser ? 'admin' : 'user';

    const countPrefix = await UserModel.countByPrefix('CT-');
    const nextIdNumber = 55001 + countPrefix;
    const userId = `CT-${nextIdNumber}`;

    const role = await RoleModel.findByRoleType(initialRole);
    if (!role) {
      return res.status(500).json({ error: "System role could not be configured" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const tenantId = req.headers['x-tenant-id'] as string;

    await UserModel.create({
      id: userId,
      fullName,
      email: emailLower,
      username: username.toLowerCase(),
      role: initialRole,
      password: hashedPassword,
      status: 1,
      phoneNumber: phoneNumber || undefined,
      roleId: role.id,
      tenantId
    });

    await UserModel.assignRole(userId, role.id);

    const assignedRoles = await UserModel.getAssignedRoles(userId);

    const newUser = {
      id: userId,
      fullName,
      email: emailLower,
      username: username.toLowerCase(),
      role: initialRole,
      phoneNumber,
      tenantId,
      assignedRoles
    };
    const token = jwt.sign({ id: userId, role: initialRole }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Trigger notification to admin and managers asynchronously
    setImmediate(async () => {
      try {
        const db = getDatabase();
        const admins = await db.all<{ id: string }[]>(
          `SELECT u.id FROM users u
           JOIN user_roles ur ON ur.userId = u.id
           JOIN roles r ON r.id = ur.roleId
           WHERE r.roleType IN ('admin', 'manager')`,
          []
        );
        const adminUserIds = admins.map(u => u.id);
        if (adminUserIds.length > 0) {
          await sendPushNotification(
            adminUserIds,
            'New User Registered',
            `User "${fullName}" (${userId}) has registered for a portal account.`,
            '/users'
          );
        }
      } catch (notifError) {
        console.error('Failed to send registration notification:', notifError);
      }
    });

    res.status(201).json({ message: "Registration successful", user: newUser, token });
  } catch (error: any) {
    console.error("Register error", error);
    res.status(500).json({ error: "Internal server error during registration" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const db = getDatabase();
    if (tenantId) {
      const tenant = await db.get("SELECT isActive FROM tenants WHERE id = ?", [tenantId]);
      if (tenant && tenant.isActive === 0) {
        return res.status(403).json({ error: "This organization account is currently suspended. Please contact support." });
      }
    }

    const user = await UserModel.findByUsernameOrEmail(username, tenantId);
    if (!user) {
      return res.status(404).json({ error: "No account found for this username/email" });
    }

    if (user.username !== 'admin' && !user.status) {
      return res.status(403).json({ error: "Your account is pending approval. Please contact an administrator." });
    }

    if (!user.password) {
      return res.status(403).json({ error: "Password not set. Please use the 'Forgot Password' link to create one." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    const { password: _, ...userToSend } = user;
    const userRoles = await UserModel.getAssignedRoles(user.id);
    (userToSend as any).assignedRoles = userRoles;

    res.json({ message: "Welcome inside CapitalTrust Portal", user: userToSend, token });
  } catch (error) {
    console.error("Login error", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
};

export const me = async (req: Request, res: Response) => {
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await UserModel.findById(payload.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const userRoles = await UserModel.getAssignedRoles(payload.id);
    (user as any).assignedRoles = userRoles;
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const logout = (req: Request, res: Response) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.status(200).json({ message: "Logged out successfully" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findByUsernameOrEmail(email, null);

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      await UserModel.createPasswordResetToken(user.id, token, expiresAt);
      console.log(`Password reset link for ${email}: http://localhost:5173/reset-password?token=${token}`);
    }

    res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required." });
    }

    const resetRequest = await UserModel.getPasswordResetToken(token);

    if (!resetRequest || new Date(resetRequest.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Invalid or expired password reset token." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await UserModel.update(resetRequest.userId, { password: hashedPassword });
    await UserModel.deletePasswordResetToken(resetRequest.id);

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const { fullName, email, phoneNumber, profileImage } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: "Full name and email are required" });
    }

    await UserModel.update(payload.id, {
      fullName,
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || null,
      profileImage: profileImage || null
    });

    const user = await UserModel.findById(payload.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRoles = await UserModel.getAssignedRoles(payload.id);
    (user as any).assignedRoles = userRoles;

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    const user = await UserModel.findById(payload.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password || '');
    if (!passwordMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await UserModel.update(payload.id, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
