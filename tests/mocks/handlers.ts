import { http, HttpResponse } from 'msw'

/**
 * MSW handlers for mocking API calls in tests
 */
export const handlers = [
  // Mock OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Mocked AI response for testing',
            tool_calls: [],
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 10,
        total_tokens: 20,
      },
    })
  }),

  // Mock Anthropic API
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Mocked AI response for testing',
        },
      ],
      model: 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 10,
      },
    })
  }),

  // Mock Vercel AI SDK chat endpoint
  http.post('*/api/chat', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'test-message-id',
      content: 'Mocked response',
      role: 'assistant',
    })
  }),
]

/**
 * Handlers for AI tool testing with mock responses
 */
export const aiToolHandlers = [
  http.post('*/api/chat', async ({ request }) => {
    const body = await request.json() as { messages: Array<{ content: string }> }
    const lastMessage = body.messages[body.messages.length - 1]

    // Detect which tool should be called based on message content
    let response = {
      id: 'test-msg',
      role: 'assistant' as const,
      content: 'Mocked AI response',
    }

    if (lastMessage.content.toLowerCase().includes('leave balance')) {
      response = {
        id: 'test-msg',
        role: 'assistant',
        content: 'You have 18.5 vacation days remaining.',
      }
    }

    return HttpResponse.json(response)
  }),
]
