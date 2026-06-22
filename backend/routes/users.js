const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getUsers } = require('../controllers/usersController');
const { validateRegister, validateLogin } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');

// POST /api/users/register
router.post('/register', validateRegister, registerUser);

// POST /api/users/login
router.post('/login', validateLogin, loginUser);

// POST /api/users/logout
router.post('/logout', requireAuth, logoutUser);

// GET /api/users (secured)
router.get('/', requireAuth, getUsers);

module.exports = router;

