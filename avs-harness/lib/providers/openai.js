const OpenAI = require('openai');
const config = require('../config');

class OpenAIProvider {
  constructor() {
    this.model = 'openai/gpt-oss-20b';
    this.client = null;
    this.initializeClient();
  }
  
  initializeClient() {
    // Determine base URL based on model
    let baseURL;
    let apiKey;
    if (/^gpt-/.test(this.model)) {
      baseURL = 'https://api.openai.com/v1';
      apiKey = config.openaiApiKey;
    } else {
      baseURL = process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
      apiKey = baseURL.includes('groq.com')
        ? (process.env.GROQ_API_KEY || config.openaiApiKey)
        : config.openaiApiKey;
    }
    
    this.client = new OpenAI({
      apiKey,
      baseURL,
      maxRetries: 6
    });
  }
  
  setModel(modelName) {
    this.model = modelName;
    this.initializeClient(); // Reinitialize with correct base URL
  }
  
  async invoke(prompt, tools, options = {}) {
    const temperature = options.temperature ?? config.temperature;
    const topP = options.topP ?? config.topP;
    const toolChoice = options.toolChoice ?? config.toolChoice;
    const messages = options.messages || [
      {
        role: 'user',
        content: prompt
      }
    ];
    
    const params = {
      model: this.model,
      temperature,
      top_p: topP,
      messages
    };
    
    // Add tools if provided
    if (tools && tools.length > 0) {
      params.tools = tools;
      if (toolChoice === 'auto') {
        params.tool_choice = 'auto';
      }
    }
    
    const maxAttempts = options.maxToolUseAttempts ?? 5;
    let response;
    let attempts = 0;
    let rejectedAttempts = 0;
    while (!response) {
      attempts++;
      try {
        response = await this.client.chat.completions.create(params);
      } catch (err) {
        const isRejectedToolCall = !params.tools && err?.status === 400 && err?.error?.code === 'tool_use_failed';
        if (!isRejectedToolCall) {
          throw err;
        }
        rejectedAttempts++;
        if (attempts >= maxAttempts) {
          return {
            output: '',
            toolCalls: [],
            message: { role: 'assistant', content: '' },
            rawResponse: null,
            attempts,
            rejectedAttempts,
            exhausted: true
          };
        }
      }
    }
    
    const message = response.choices[0].message;
    
    // Extract tool calls
    const toolCalls = (message.tool_calls || []).map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }));
    
    return {
      output: message.content || '',
      toolCalls,
      message,
      rawResponse: response,
      attempts,
      rejectedAttempts,
      exhausted: false
    };
  }
  
  createToolResultMessages(assistantMessage, toolResults) {
    // Create messages array for turn 2
    const messages = [
      {
        role: 'assistant',
        content: assistantMessage.content ?? null,
        tool_calls: assistantMessage.tool_calls
      },  // The assistant message with tool_calls
      ...toolResults.map(result => ({
        role: 'tool',
        tool_call_id: result.tool_call_id,
        content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
      }))
    ];
    return messages;
  }
  
  // Tool definitions for PCS retrieval
  getPcsTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'retrieve_decision',
          description: 'Retrieve a previously committed decision from persistent cognitive state',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Query to search for relevant decisions'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_policy',
          description: 'Check if a proposed action is allowed by governance policies',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'object',
                description: 'The action to check',
                properties: {
                  type: {
                    type: 'string',
                    description: 'Type of action (e.g., vendor_recommendation)'
                  },
                  candidate: {
                    type: 'string',
                    description: 'The candidate being evaluated'
                  },
                  attributes: {
                    type: 'object',
                    description: 'Additional attributes of the action'
                  }
                },
                required: ['type', 'candidate']
              }
            },
            required: ['action']
          }
        }
      }
    ];
  }
  
  // Tool definitions for policy enforcement only (AVS-2P)
  // Flattened schema for Llama compatibility (no nested objects)
  getPolicyTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'check_policy',
          description: 'Check whether a vendor is allowed for a procurement recommendation. Returns ALLOW or DENY.',
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              action: {
                type: 'string',
                description: 'Action type, e.g. vendor_recommendation'
              },
              vendor: {
                type: 'string',
                description: 'Vendor name to evaluate, e.g. VendorX'
              }
            },
            required: ['action', 'vendor']
          }
        }
      }
    ];
  }
}

module.exports = OpenAIProvider;
