const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerSchema, loginSchema } = require('../validators/schemas');

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('Thiếu JWT_SECRET');
  }

  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        message: 'Email đã được sử dụng',
      });
    }

    const user = await User.create({
      ...data,
      email,
    });

    return res.status(201).json({
      message: 'Đăng ký thành công',
      token: createToken(user),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
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

    const passwordMatches = await user.comparePassword(data.password);

    if (!passwordMatches) {
      // Không tiết lộ tài khoản thiếu hash hay mật khẩu sai cho client.
      console.warn(
        `Đăng nhập không thành công: mật khẩu không khớp hoặc tài khoản thiếu password hash (userId: ${user._id})`
      );

      return res.status(401).json({
        message: 'Email hoặc mật khẩu không chính xác. Nếu đây là tài khoản cũ, vui lòng đăng ký lại hoặc yêu cầu đặt lại mật khẩu.',
      });
    }

    return res.json({
      message: 'Đăng nhập thành công',
      token: createToken(user),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login };