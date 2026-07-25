import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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

    const tenantId = req.headers['x-tenant-id'] as string;
    const emailLower = email.toLowerCase();
    const existing = await UserModel.findByUsernameOrEmail(username, tenantId) || await UserModel.findByUsernameOrEmail(email, tenantId);
    if (existing) {
      return res.status(400).json({ error: "Account with this email/username already exists under this organization." });
    }

    const usersCount = await UserModel.countAll();
    const isFirstUser = usersCount === 0;
    const initialRole = isFirstUser ? 'admin' : 'user';

    const countPrefix = await UserModel.countByPrefix('CT-');
    const nextIdNumber = 55001 + countPrefix;
    const userId = `CT-${nextIdNumber}`;

    const role = await RoleModel.findByRoleType(initialRole, tenantId);
    if (!role) {
      return res.status(500).json({ error: "System role could not be configured for this organization." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await UserModel.create({
      id: userId,
      fullName,
      email: emailLower,
      username: username.toLowerCase(),
      role: initialRole,
      password: hashedPassword,
      status: 0,
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
    const token = jwt.sign({ id: userId, role: initialRole }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

    const db = getDatabase();
    await db.run("UPDATE users SET refreshToken = ? WHERE id = ?", [refreshToken, userId]);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Trigger notification to admin and managers asynchronously
    setImmediate(async () => {
      try {
        const db = getDatabase();
        const admins = await db.all<{ id: string }[]>(
          `SELECT DISTINCT u.id FROM users u
           JOIN user_roles ur ON ur.userId = u.id
           JOIN roles r ON r.id = ur.roleId
           WHERE r.roleType IN ('admin', 'manager') AND u.tenantId = ?`,
          [tenantId]
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

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    await db.run("UPDATE users SET refreshToken = ? WHERE id = ?", [refreshToken, user.id]);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.cookie('refreshToken', refreshToken, {
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

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (token) {
      const payload = jwt.decode(token) as { id: string } | null;
      if (payload?.id) {
        const db = getDatabase();
        await db.run("UPDATE users SET refreshToken = NULL WHERE id = ?", [payload.id]);
      }
    }
  } catch (e) {
    // Ignore decode/db errors during logout
  }

  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.cookie('refreshToken', '', {
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

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const tenantId = req.headers['x-tenant-id'] as string | undefined;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant context is missing." });
    }

    const user = await UserModel.findByUsernameOrEmail(email, tenantId);

    if (!user) {
      return res.status(404).json({ error: "No account found with that email address." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000);

    await UserModel.createPasswordResetToken(user.id, token, expiresAt);

    // Build reset URL from incoming request host
    const protocol = (req.headers['x-forwarded-proto'] as string) || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || 'localhost:5173';
    const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;

    // Send password reset email via active SMTP config
    try {
      const { createActiveTransporter } = await import('../utils/mailer');
      const { transporter, fromAddress } = await createActiveTransporter();
      await transporter.sendMail({
        from: `"CapitalTrust Support" <${fromAddress}>`,
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
            <div style="text-align: center; padding-bottom: 20px; border-b: 1px solid #1e293b;">
              <h2 style="color: #6366f1; margin: 0; font-size: 22px;">CapitalTrust Platform</h2>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Password Reset Request</p>
            </div>
            <div style="padding: 20px 0;">
              <h3 style="color: #ffffff; font-size: 18px;">Hello, ${user.fullName}!</h3>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                We received a request to reset the password for your account associated with <strong>${user.email}</strong>.
              </p>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                  Reset My Password &rarr;
                </a>
              </div>
              <p style="color: #64748b; font-size: 12px;">
                If you did not request a password reset, please ignore this email. Your account is safe and no changes have been made.
              </p>
              <p style="color: #64748b; font-size: 12px; margin-top: 8px;">
                If the button above does not work, copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" style="color: #818cf8; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
              &copy; ${new Date().getFullYear()} CapitalTrust Portal Services. All rights reserved.
            </div>
          </div>
        `
      });
      console.log(`Password reset email sent to ${user.email}`);
    } catch (mailErr) {
      console.error("Failed to send password reset email:", mailErr);
    }

    res.status(200).json({ message: `A password reset link has been sent to ${user.email}.` });
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

    let savedProfileImagePath = profileImage;

    if (profileImage && profileImage.startsWith('data:image/')) {
      const matches = profileImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        let ext = 'png';
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
          ext = 'jpg';
        } else if (mimeType.includes('gif')) {
          ext = 'gif';
        } else if (mimeType.includes('webp')) {
          ext = 'webp';
        }

        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Clean up old image if there was one
        const existingUser = await UserModel.findById(payload.id);
        if (existingUser && existingUser.profileImage) {
          const oldFileUrl = existingUser.profileImage;
          if (oldFileUrl.startsWith('/uploads/')) {
            const oldFilePath = path.join(process.cwd(), oldFileUrl.substring(1)); // strip leading slash
            if (fs.existsSync(oldFilePath)) {
              try {
                fs.unlinkSync(oldFilePath);
              } catch (e) {
                console.error("Failed to delete old avatar file", e);
              }
            }
          }
        }

        const fileName = `profile_${payload.id}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);
        savedProfileImagePath = `/uploads/${fileName}`;
      }
    }

    await UserModel.update(payload.id, {
      fullName,
      email: email.toLowerCase(),
      phoneNumber: phoneNumber || null,
      profileImage: savedProfileImagePath || null
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

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token missing" });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as { id: string };
    const db = getDatabase();

    const user = await db.get<{ id: string; role: string; refreshToken: string }>(
      "SELECT id, role, refreshToken FROM users WHERE id = ?",
      [payload.id]
    );
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({ token: newAccessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
};
