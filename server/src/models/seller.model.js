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
