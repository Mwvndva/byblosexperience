import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { AppError } from '../utils/errorHandler.js';


// Import cookie-parser if not already imported
import cookieParser from 'cookie-parser';

export const protect = async (req, res, next) => {
  try {
    console.log('\n=== Auth Middleware ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    
    // Parse cookies if not already parsed
    if (!req.cookies) {
      cookieParser()(req, res, () => {});
    }
    
    // 1) Get token and check if it exists
    let token;
    
    // Check 1: Check Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Token found in Authorization header');
    } 
    // Check 2: Check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookies');
    }
    // Check 3: Check query parameters (for testing only, not recommended for production)
    else if (req.query && req.query.token) {
      token = req.query.token;
      console.log('Token found in query parameters');
    }

    if (!token) {
      console.log('No authentication token found in any location');
      console.log('Available headers:', Object.keys(req.headers));
      if (req.cookies) {
        console.log('Available cookies:', Object.keys(req.cookies));
      }
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }
    
    console.log('Token found, length:', token ? token.length : 'invalid');

    // 2) Verify token
    console.log('Auth middleware - Verifying token:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token verified. User ID:', decoded.id);

    // 3) Check if user is admin or exists in sellers/organizers tables
    let user = null;
    let userType = 'seller';
    
    // Check if this is the admin user
    if (decoded.id === 'admin') {
      user = {
        id: 'admin',
        email: 'admin@byblos.com',
        userType: 'admin'
      };
    } else {
      // Try to find in sellers table
      try {
        const sellerResult = await query(
          'SELECT id, email FROM sellers WHERE id = $1',
          [decoded.id]
        );
        
        if (sellerResult.rows[0]) {
          user = sellerResult.rows[0];
          userType = 'seller';
        } else {
          // If not found in sellers, try organizers table
          const organizerResult = await query(
            'SELECT id, email, full_name as name FROM organizers WHERE id = $1',
            [decoded.id]
          );
          if (organizerResult.rows[0]) {
            user = organizerResult.rows[0];
            userType = 'organizer';
          }
        }
      } catch (dbError) {
        console.error('Database error during user lookup:', dbError);
        return next(new AppError('Error during authentication', 500));
      }

      if (!user) {
        return next(new AppError('The user belonging to this token no longer exists.', 401));
      }
      
      // Add user type to the user object
      user.userType = userType;
    }


    // 4) Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again!', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    }
    
    console.error('Authentication error:', error);
    return next(new AppError('Authentication failed', 500));
  }
};
