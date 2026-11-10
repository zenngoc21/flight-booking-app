
const { askAI } = require('../services/aiService');

async function chatWithAI(req, res, next) {
  try {
    const { message, history = [] } = req.body || {};

    if (
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung câu hỏi không hợp lệ.',
      });
    }

    if (!Array.isArray(history) || history.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Lịch sử trò chuyện không hợp lệ.',
      });
    }

    const safeHistory = [];

    for (const item of history) {
      if (
        !item ||
        typeof item !== 'object' ||
        !['user', 'assistant'].includes(item.role) ||
        typeof item.content !== 'string' ||
        !item.content.trim() ||
        item.content.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: 'Lịch sử trò chuyện không hợp lệ.',
        });
      }

      safeHistory.push({
        role: item.role,
        content: item.content.trim(),
      });
    }

    const reply = await askAI(message.trim(), safeHistory);

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { chatWithAI };
