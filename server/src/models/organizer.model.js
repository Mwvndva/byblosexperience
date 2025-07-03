import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

const SALT_ROUNDS = 10;

const Organizer = {
  // Add matchPassword method to the instance
  async matchPassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  },
  
  // Add method to update password
  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await pool.query(
      'UPDATE organizers SET password = $1 WHERE id = $2 RETURNING id, full_name, email, phone',
      [hashedPassword, id]
    );
    return result.rows[0];
  },
  
  // Add method to find by ID and update
  async findByIdAndUpdate(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    // Build the SET clause dynamically based on provided updates
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields provided for update');
    }
    
    // Add the ID as the last parameter
    values.push(id);
    
    const query = `
      UPDATE organizers 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, full_name, email, phone
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },
  
  // Existing methods
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM organizers WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM organizers WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create({ full_name, email, phone, password }) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const result = await pool.query(
      `INSERT INTO organizers 
       (full_name, email, phone, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, created_at`,
      [full_name, email, phone, hashedPassword]
    );

    return result.rows[0];
  },

  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  async updateLastLogin(id) {
    await pool.query(
      'UPDATE organizers SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  },

  async setResetPasswordToken(email, token, expires) {
    await pool.query(
      'UPDATE organizers SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [token, expires, email]
    );
  },

  async resetPassword(token, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await pool.query(
      `UPDATE organizers 
       SET password = $1, reset_password_token = NULL, reset_password_expires = NULL 
       WHERE reset_password_token = $2 AND reset_password_expires > NOW()
       RETURNING id, email`,
      [hashedPassword, token]
    );
    return result.rows[0];
  }
};

export default Organizer;
