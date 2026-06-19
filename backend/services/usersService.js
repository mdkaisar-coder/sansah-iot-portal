const bcrypt = require('bcrypt');
const { pool } = require('../db');

class UsersService {
  async getUserByEmail(email) {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return users[0] || null;
  }

  async registerUser(data) {
    const { full_name, email, password } = data;
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save in DB
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
      [full_name, email, hashedPassword]
    );

    return {
      id: result.insertId,
      full_name,
      email
    };
  }

  async verifyUserCredentials(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email
    };
  }

  async getAllUsers() {
    const [users] = await pool.query('SELECT id, full_name, email FROM users');
    return users;
  }
}

module.exports = new UsersService();
