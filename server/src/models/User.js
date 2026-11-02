const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

// Không bao giờ lưu mật khẩu dạng văn bản thuần.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  // Tài khoản cũ hoặc dữ liệu không đầy đủ có thể chưa có password hash.
  // Trả về false thay vì truyền undefined vào bcrypt.compare (gây HTTP 500).
  if (
    typeof candidatePassword !== 'string' ||
    typeof this.password !== 'string' ||
    !this.password
  ) {
    return false;
  }

  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    // Hash không hợp lệ cũng được xem là thông tin đăng nhập không khớp.
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);