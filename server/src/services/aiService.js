
const OpenAI = require('openai');
const { searchFlightsForAI } = require('./aiFlightService');

// Khởi tạo OpenAI khi thực sự cần gọi API.
// Tránh lỗi ngay lúc server import file nếu chưa cấu hình API key.
let openai;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Chưa cấu hình OPENAI_API_KEY.');
  }

  if (!process.env.OPENAI_MODEL) {
    throw new Error('Chưa cấu hình OPENAI_MODEL.');
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openai;
}

const tools = [
  {
    type: 'function',
    name: 'search_flights',
    description: 'Tìm chuyến bay thực tế trong cơ sở dữ liệu Flight Booking.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Mã sân bay đi gồm 3 ký tự.',
        },
        to: {
          type: 'string',
          description: 'Mã sân bay đến gồm 3 ký tự.',
        },
        date: {
          type: 'string',
          description: 'Ngày bay YYYY-MM-DD.',
        },
        maxPrice: {
          type: ['number', 'null'],
          description: 'Giá tối đa, hoặc null nếu không giới hạn.',
        },
        sort: {
          type: 'string',
          enum: ['best', 'cheapest', 'fastest'],
        },
        cabinClass: {
          type: 'string',
          enum: ['economy', 'premium_economy', 'business', 'first'],
        },
      },
      required: [
        'from',
        'to',
        'date',
        'maxPrice',
        'sort',
        'cabinClass',
      ],
      additionalProperties: false,
    },
  },
];

const SYSTEM_PROMPT = `
Bạn là SKYHAVEN AI, trợ lý đặt vé máy bay của ứng dụng Flight Booking.

Nhiệm vụ:
1. Giao tiếp bằng tiếng Việt.
2. Tư vấn đặt vé máy bay.
3. Tìm kiếm chuyến bay bằng dữ liệu thật từ hệ thống.
4. So sánh giá, thời gian bay và hãng hàng không.
5. Giải thích các thông tin đặt vé.

Quy tắc:
- Không tự tạo chuyến bay, mã chuyến bay hoặc giá vé.
- Chỉ sử dụng dữ liệu trả về từ công cụ tìm kiếm.
- Nếu thiếu sân bay đi, sân bay đến hoặc ngày bay, hãy hỏi lại.
- Nếu người dùng không chỉ định hạng ghế, mặc định economy.
- Nếu người dùng không chỉ định ngân sách, đặt maxPrice là null.
- Nếu người dùng yêu cầu giá thấp, chọn sort là cheapest.
- Nếu người dùng yêu cầu bay nhanh, chọn sort là fastest.
- Nếu người dùng không yêu cầu cụ thể, chọn sort là best.
- Khi đủ thông tin, sử dụng function search_flights.
- Chỉ giới thiệu chuyến bay được trả về từ công cụ.
- Nếu không có chuyến bay, thông báo rõ ràng.
- Không tự ý đặt vé, giữ ghế hoặc thanh toán.
- Không yêu cầu mật khẩu, OTP hoặc thông tin thẻ.
- Trình bày ngắn gọn, dễ hiểu.
`;

function validateFlightArguments(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('Tham số tìm kiếm không hợp lệ.');
  }

  const { from, to, date, maxPrice, sort, cabinClass } = args;

  if (
    typeof from !== 'string' ||
    typeof to !== 'string' ||
    !/^[A-Z]{3}$/i.test(from) ||
    !/^[A-Z]{3}$/i.test(to) ||
    from.toUpperCase() === to.toUpperCase()
  ) {
    throw new Error('Mã sân bay không hợp lệ.');
  }

  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new Error('Ngày bay không hợp lệ.');
  }

  if (
    maxPrice !== null &&
    (
      typeof maxPrice !== 'number' ||
      !Number.isFinite(maxPrice) ||
      maxPrice <= 0
    )
  ) {
    throw new Error('Ngân sách không hợp lệ.');
  }

  if (!['best', 'cheapest', 'fastest'].includes(sort)) {
    throw new Error('Kiểu sắp xếp không hợp lệ.');
  }

  if (
    !['economy', 'premium_economy', 'business', 'first']
      .includes(cabinClass)
  ) {
    throw new Error('Hạng ghế không hợp lệ.');
  }
}

async function askAI(message, previousMessages = []) {
  const client = getOpenAIClient();

  if (
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 2000
  ) {
    throw new Error('Nội dung câu hỏi không hợp lệ.');
  }

  if (!Array.isArray(previousMessages)) {
    throw new Error('Lịch sử hội thoại không hợp lệ.');
  }

  const history = previousMessages.slice(-10).map((item) => {
    if (
      !item ||
      !['user', 'assistant'].includes(item.role) ||
      typeof item.content !== 'string'
    ) {
      throw new Error('Lịch sử hội thoại không hợp lệ.');
    }

    return {
      role: item.role,
      content: item.content.slice(0, 2000),
    };
  });

  let response = await client.responses.create({
    model: process.env.OPENAI_MODEL,
    instructions: SYSTEM_PROMPT,
    input: [
      ...history,
      {
        role: 'user',
        content: message.trim(),
      },
    ],
    tools,
  });

  let attempts = 0;
  const MAX_TOOL_CALLS = 5;

  while (true) {
    const toolCalls = response.output.filter(
      (item) => item.type === 'function_call'
    );

    if (toolCalls.length === 0) {
      return (
        response.output_text ||
        'Xin lỗi, tôi chưa thể tạo câu trả lời.'
      );
    }

    if (attempts + toolCalls.length > MAX_TOOL_CALLS) {
      throw new Error('AI vượt quá số lần gọi công cụ cho phép.');
    }

    attempts += toolCalls.length;

    const toolOutputs = [];

    for (const toolCall of toolCalls) {
      if (toolCall.name !== 'search_flights') {
        throw new Error('AI yêu cầu công cụ không được hỗ trợ.');
      }

      let result;

      try {
        const args = JSON.parse(toolCall.arguments);

        validateFlightArguments(args);

        const flights = await searchFlightsForAI({
          ...args,
          from: args.from.toUpperCase(),
          to: args.to.toUpperCase(),
        });

        result = {
          success: true,
          count: flights.length,
          data: flights,
        };
      } catch (error) {
        // Chỉ gửi lỗi nghiệp vụ đã biết cho AI.
        // Không chuyển lỗi MongoDB hoặc lỗi nội bộ nguyên bản.
        const safeMessages = [
          'Mã sân bay không hợp lệ.',
          'Ngày bay không hợp lệ.',
          'Ngân sách không hợp lệ.',
          'Kiểu sắp xếp không hợp lệ.',
          'Hạng ghế không hợp lệ.',
          'Tham số tìm kiếm không hợp lệ.',
        ];

        result = {
          success: false,
          message: safeMessages.includes(error.message)
            ? error.message
            : 'Không thể thực hiện tìm kiếm chuyến bay lúc này.',
          data: [],
        };
      }

      toolOutputs.push({
        type: 'function_call_output',
        call_id: toolCall.call_id,
        output: JSON.stringify(result),
      });
    }

    response = await client.responses.create({
      model: process.env.OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      previous_response_id: response.id,
      input: toolOutputs,
      tools,
    });
  }
}

module.exports = {
  askAI,
};
