const usersService = require('../services/usersService');

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

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: user
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
  getUsers
};
