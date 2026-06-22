import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from '../database';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-env-vars";

export const register = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { fullName, email, username, password, phoneNumber } = req.body;
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ error: "Missing required fields: fullName, email, username, password" });
    }

    const emailLower = email.toLowerCase();
    const existing = await db.get("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?", [emailLower, username.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: "Account with this email already exists" });
    }

    const rolesCount = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM users");
    const isFirstUser = !rolesCount || rolesCount.count === 0;
    const initialRole = isFirstUser ? 'admin' : 'user';

    const countRes = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE id LIKE 'CT-%'");
    const nextIdNumber = 55001 + (countRes?.count || 0);
    const userId = `CT-${nextIdNumber}`;

    const role = await db.get<{ id: number }>("SELECT id FROM roles WHERE roleType = ?", [initialRole]);
    if (!role) {
      return res.status(500).json({ error: "System role could not be configured" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.run(
      "INSERT INTO users (id, fullName, email, username, role, password, status, phoneNumber, roleId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, fullName, emailLower, username.toLowerCase(), initialRole, hashedPassword, 1, phoneNumber || null, role.id]
    );

    await db.run(
      "INSERT INTO user_roles (userId, roleId) VALUES (?, ?)",
      [userId, role.id]
    );

    const roleInfo = await db.get<{ roleName: string }>("SELECT roleName FROM roles WHERE id = ?", [role.id]);

    const newUser = {
      id: userId,
      fullName,
      email: emailLower,
      username: username.toLowerCase(),
      role: initialRole,
      phoneNumber,
      assignedRoles: [{ id: role.id, roleName: roleInfo?.roleName || 'Member', roleType: initialRole }]
    };
    const token = jwt.sign({ id: userId, role: initialRole }, JWT_SECRET, { expiresIn: '1d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(201).json({ message: "Registration successful", user: newUser, token });
  } catch (error: any) {
    console.error("Register error", error);
    res.status(500).json({ error: "Internal server error during registration" });
  }
};

export const login = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const loginIdentifier = username.toLowerCase();
    const user = await db.get("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?", [loginIdentifier, loginIdentifier]);
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
    const userRoles = await db.all(`
      SELECT r.id, r.roleName, r.roleType FROM roles r
      JOIN user_roles ur ON r.id = ur.roleId
      WHERE ur.userId = ?
    `, [user.id]);
    (userToSend as any).assignedRoles = userRoles;

    res.json({ message: "Welcome inside CapitalTrust Portal", user: userToSend, token });
  } catch (error) {
    console.error("Login error", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
};

export const me = async (req: Request, res: Response) => {
  const db = getDatabase();
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await db.get("SELECT id, fullName, email, username, role, status, phoneNumber, profileImage FROM users WHERE id = ?", [payload.id]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const userRoles = await db.all(`
      SELECT r.id, r.roleName, r.roleType FROM roles r
      JOIN user_roles ur ON r.id = ur.roleId
      WHERE ur.userId = ?
    `, [payload.id]);
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
  const db = getDatabase();
  try {
    const { email } = req.body;
    const user = await db.get("SELECT id FROM users WHERE email = ?", [email]);

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // ISO String is safer for sqlite

      await db.run(
        "INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)",
        [user.id, token, expiresAt]
      );

      console.log(`Password reset link for ${email}: http://localhost:5173/reset-password?token=${token}`);
    }

    res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required." });
    }

    const resetRequest = await db.get("SELECT * FROM password_reset_tokens WHERE token = ?", [token]);

    if (!resetRequest || new Date(resetRequest.expiresAt) < new Date()) {
      return res.status(400).json({ error: "Invalid or expired password reset token." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, resetRequest.userId]);
    await db.run("DELETE FROM password_reset_tokens WHERE id = ?", [resetRequest.id]);

    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Reset password error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const db = getDatabase();
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

    await db.run(
      "UPDATE users SET fullName = ?, email = ?, phoneNumber = ?, profileImage = ? WHERE id = ?",
      [fullName, email.toLowerCase(), phoneNumber || null, profileImage || null, payload.id]
    );

    const user = await db.get("SELECT id, fullName, email, username, role, status, phoneNumber, profileImage FROM users WHERE id = ?", [payload.id]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userRoles = await db.all(`
      SELECT r.id, r.roleName, r.roleType FROM roles r
      JOIN user_roles ur ON r.id = ur.roleId
      WHERE ur.userId = ?
    `, [payload.id]);
    (user as any).assignedRoles = userRoles;

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Update profile error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const db = getDatabase();
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

    const user = await db.get("SELECT password FROM users WHERE id = ?", [payload.id]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password match
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, payload.id]);

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
