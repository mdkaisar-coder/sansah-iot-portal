const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');

// GET /api/audit-logs
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', action = '' } = req.query;
    const result = await auditService.getAuditLogs({ page, limit, search, action });
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
