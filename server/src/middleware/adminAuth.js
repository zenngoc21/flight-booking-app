const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAdmin(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Vui lòng đăng nhập Admin',
      });
    }

    const token = authorization.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.sub).select('_id fullName email role');

    if (!user) {
      return res.status(401).json({
        message: 'Tài khoản không tồn tại',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập trang quản trị',
      });
    }

    req.admin = user;
    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Token không hợp lệ hoặc đã hết hạn',
      });
    }

    next(error);
  }
}

module.exports = { requireAdmin };