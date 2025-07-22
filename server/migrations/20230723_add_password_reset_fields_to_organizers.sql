-- Add password reset token and expiration fields to organizers table
ALTER TABLE organizers 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizers_password_reset_token ON organizers(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_organizers_password_reset_expires ON organizers(password_reset_expires);
