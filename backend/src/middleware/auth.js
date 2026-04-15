const jwt = require('jsonwebtoken');

/**
 * 驗證 JWT，將解碼後的 payload 掛到 req.user
 * Header 格式：Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: '未提供 token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'token 無效或已過期' });
  }
}

module.exports = authMiddleware;
