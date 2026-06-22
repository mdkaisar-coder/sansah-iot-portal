const { pool } = require('../db');

class AuditService {
  async logAction(userId, username, action, details, ipAddress) {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, username, action, details, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [result] = await pool.query(query, [
        userId || null,
        username || null,
        action,
        details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null,
        ipAddress || null
      ]);
      return result.insertId;
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
      // Do not crash the app/request if logging fails
    }
  }

  async getAuditLogs({ page = 1, limit = 10, search = '', action = '' } = {}) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offsetNum = (pageNum - 1) * limitNum;

    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    let selectQuery = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      countQuery += ' AND action = ?';
      selectQuery += ' AND action = ?';
      params.push(action);
    }

    if (search) {
      countQuery += ' AND (username LIKE ? OR details LIKE ? OR ip_address LIKE ?)';
      selectQuery += ' AND (username LIKE ? OR details LIKE ? OR ip_address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    selectQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    const selectParams = [...params, limitNum, offsetNum];

    const [[{ total }]] = await pool.query(countQuery, params);
    const [logs] = await pool.query(selectQuery, selectParams);

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      data: logs
    };
  }
}

module.exports = new AuditService();
