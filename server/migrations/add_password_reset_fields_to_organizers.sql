-- Add password reset token and expiration fields to organizers table
ALTER TABLE organizers 
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP;
