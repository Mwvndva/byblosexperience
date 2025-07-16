import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const SALT_ROUNDS = 10;

export const createSeller = async (sellerData) => {
  const { fullName, email, phone, password } = sellerData;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await query(
    `INSERT INTO sellers (full_name, email, phone, password)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name AS "fullName", email, phone, created_at AS "createdAt"`,
    [fullName, email, phone, hashedPassword]
  );
  
  return result.rows[0];
};

export const findSellerByEmail = async (email) => {
  const result = await query(
    `SELECT id, full_name AS "fullName", email, phone, password, created_at AS "createdAt"
     FROM sellers WHERE email = $1`,
    [email]
  );
  return result.rows[0];
};

export const findSellerById = async (id) => {
  const result = await query(
    `SELECT id, full_name AS "fullName", email, phone, created_at AS "createdAt"
     FROM sellers WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

export const updateSeller = async (id, updates) => {
  const { fullName, email, phone, password } = updates;
  const updatesList = [];
  const values = [id];
  let paramCount = 1;

  if (fullName) {
    paramCount++;
    updatesList.push(`full_name = $${paramCount}`);
    values.push(fullName);
  }
  
  if (email) {
    paramCount++;
    updatesList.push(`email = $${paramCount}`);
    values.push(email);
  }
  
  if (phone) {
    paramCount++;
    updatesList.push(`phone = $${paramCount}`);
    values.push(phone);
  }
  
  if (password) {
    paramCount++;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    updatesList.push(`password = $${paramCount}`);
    values.push(hashedPassword);
  }

  if (updatesList.length === 0) {
    throw new Error('No valid fields to update');
  }

  const queryText = `
    UPDATE sellers
    SET ${updatesList.join(', ')}
    WHERE id = $1
    RETURNING id, full_name AS "fullName", email, phone, created_at AS "createdAt"
  `;

  const result = await query(queryText, values);
  return result.rows[0];
};

export const generateAuthToken = (seller) => {
  return jwt.sign(
    { id: seller.id, email: seller.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

export const verifyPassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

export const createPasswordResetToken = async (email) => {
  // Generate a random token
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  // Hash the token before saving to database
  const hashedToken = await bcrypt.hash(token, SALT_ROUNDS);
  
  // Set token expiration (1 hour from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  // Save the hashed token and expiration to the database
  await query(
    `UPDATE sellers 
     SET password_reset_token = $1, 
         password_reset_expires = $2 
     WHERE email = $3`,
    [hashedToken, expiresAt, email]
  );
  
  // Return the unhashed token (to be sent via email)
  return token;
};

export const verifyPasswordResetToken = async (email, token) => {
  // Find the seller with the given email and a valid reset token
  const result = await query(
    `SELECT password_reset_token, password_reset_expires 
     FROM sellers 
     WHERE email = $1 AND password_reset_expires > NOW()`,
    [email]
  );
  
  if (!result.rows[0]) {
    return false;
  }
  
  const { password_reset_token: hashedToken } = result.rows[0];
  
  // Verify the token matches the hashed version in the database
  return await bcrypt.compare(token, hashedToken);
};

export const updatePassword = async (email, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  
  await query(
    `UPDATE sellers 
     SET password = $1, 
         password_reset_token = NULL, 
         password_reset_expires = NULL 
     WHERE email = $2`,
    [hashedPassword, email]
  );
};
