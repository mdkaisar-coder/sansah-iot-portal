const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUsers } = require('../controllers/usersController');
const { validateRegister, validateLogin } = require('../middleware/validation');

// POST /api/users/register
router.post('/register', validateRegister, registerUser);

// POST /api/users/login
router.post('/login', validateLogin, loginUser);

// GET /api/users
router.get('/', getUsers);

module.exports = router;
