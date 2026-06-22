const jwt = require('jsonwebtoken');
const usersService = require('../services/usersService');
const auditService = require('../services/auditService');

// @desc    Register a new user
// @route   POST /api/users/register
const registerUser = async (req, res, next) => {
  const { email } = req.body;

  try {
    // Prevent duplicate email registration
    const existing = await usersService.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const user = await usersService.registerUser(req.body);
    // Log registration
    await auditService.logAction(user.id, user.full_name, 'REGISTER_USER', `Registered user account: ${user.email}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    User login verification
// @route   POST /api/users/login
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await usersService.verifyUserCredentials(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT token (8 hours expiry)
    const token = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name },
      process.env.JWT_SECRET || 'super_secret_jwt_key_sansah_iot_portal',
      { expiresIn: '8h' }
    );

    // Log LOGIN
    await auditService.logAction(user.id, user.full_name, 'LOGIN', 'User successfully logged in', req.ip);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        ...user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    User logout
// @route   POST /api/users/logout
const logoutUser = async (req, res, next) => {
  try {
    if (req.user) {
      await auditService.logAction(req.user.id, req.user.full_name, 'LOGOUT', 'User logged out', req.ip);
    }
    res.status(200).json({
      success: true,
      message: 'Logout successful.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users list (excluding password hash)
// @route   GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const users = await usersService.getAllUsers();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUsers
};

