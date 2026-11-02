const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { loginSchema } = require('../validators/schemas');

async function adminLogin(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({
      email: data.email.toLowerCase(),
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    const isMatch = await user.comparePassword(data.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        message: 'Tài khoản này không có quyền Admin',
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('Thiếu JWT_SECRET trong file .env');
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      }
    );

    return res.json({
      message: 'Đăng nhập Admin thành công',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAdminProfile(req, res) {
  return res.json({
    data: {
      id: req.admin._id,
      fullName: req.admin.fullName,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
}

module.exports = {
  adminLogin,
  getAdminProfile,
};