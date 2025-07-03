import { createSeller, findSellerByEmail, findSellerById, updateSeller, generateAuthToken, verifyPassword } from '../models/seller.model.js';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req, res) => {
  const { fullName, email, phone, password, confirmPassword } = req.body;

  // Validate required fields
  if (!fullName || !email || !phone || !password || !confirmPassword) {
    return res.status(400).json({
      status: 'error',
      message: 'All fields are required'
    });
  }

  // Validate email format
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide a valid email address'
    });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({
      status: 'error',
      message: 'Password must be at least 8 characters long'
    });
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    return res.status(400).json({
      status: 'error',
      message: 'Passwords do not match'
    });
  }

  try {
    const seller = await createSeller({ fullName, email, phone, password });
    const token = generateAuthToken(seller);
    
    res.status(201).json({
      status: 'success',
      data: {
        seller,
        token
      }
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        status: 'error',
        message: 'Email already in use'
      });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

export const login = async (req, res) => {
  try {
    console.log('Login attempt with data:', { email: req.body.email });
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }
    
    // 1) Check if seller exists
    console.log('Looking up seller with email:', email);
    const seller = await findSellerByEmail(email);
    
    if (!seller) {
      console.log('No seller found with email:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }
    
    console.log('Seller found, verifying password...');
    const isPasswordValid = await verifyPassword(password, seller.password);
    
    if (!isPasswordValid) {
      console.log('Invalid password for email:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }
    
    // 2) If everything is ok, send token to client
    console.log('Password valid, generating token...');
    const token = generateAuthToken(seller);
    
    // Remove password from output
    const sellerWithoutPassword = { ...seller };
    delete sellerWithoutPassword.password;
    
    console.log('Login successful for email:', email);
    res.status(200).json({
      status: 'success',
      data: {
        seller: sellerWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const seller = await findSellerById(req.user.id);
    
    if (!seller) {
      return res.status(404).json({
        status: 'error',
        message: 'Seller not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        seller
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // Remove password field if it's included in the request body
    if (req.body.password) {
      delete req.body.password;
    }
    
    const seller = await updateSeller(req.seller.id, req.body);
    
    res.status(200).json({
      status: 'success',
      data: {
        seller
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

export const getSellerById = async (req, res) => {
  try {
    const seller = await findSellerById(req.params.id);
    
    if (!seller) {
      return res.status(404).json({
        status: 'error',
        message: 'Seller not found'
      });
    }
    
    // Format the response to match the expected frontend format
    const sellerData = {
      id: seller.id,
      fullName: seller.full_name || seller.fullName,
      email: seller.email,
      phone: seller.phone,
      createdAt: seller.created_at || seller.createdAt,
      updatedAt: seller.updated_at || seller.updatedAt
    };
    
    res.status(200).json(sellerData);
  } catch (error) {
    console.error('Error fetching seller:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch seller information'
    });
  }
};
