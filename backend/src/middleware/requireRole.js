/**
 * 角色權限檢查，需在 authMiddleware 之後使用
 * 用法：router.delete('/:emp', auth, requireRole('super'), handler)
 *
 * role 階層：super > menu
 * super 可做所有事；menu 僅能管理菜單
 */
const HIERARCHY = { super: 2, menu: 1 };

function requireRole(minRole) {
  return (req, res, next) => {
    const userLevel  = HIERARCHY[req.user?.role] ?? 0;
    const minLevel   = HIERARCHY[minRole] ?? 99;

    if (userLevel < minLevel) {
      return res.status(403).json({ error: '權限不足' });
    }
    next();
  };
}

module.exports = requireRole;
