const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

class AnthropicProvider {
  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey
    });
    this.model = 'claude-sonnet-4-6';
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
      max_tokens: 4096,
      temperature,
      messages
    };
    
    // Add tools if provided
    if (tools && tools.length > 0) {
      params.tools = tools;
      if (toolChoice === 'auto') {
        params.tool_choice = { type: 'auto' };
      }
    }
    
    const response = await this.client.messages.create(params);
    
    // Extract text content
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    // Extract tool uses
    const toolUses = response.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id,
        name: block.name,
        input: block.input
      }));
    
    return {
      output: textContent,
      toolCalls: toolUses,
      content: response.content,
      rawResponse: response
    };
  }
  
  createToolResultMessages(assistantContent, toolResults) {
    // Create messages array for turn 2
    // First message: assistant's response with tool_use blocks
    // Second message: user's response with tool_result blocks
    const messages = [
      {
        role: 'assistant',
        content: assistantContent
      },
      {
        role: 'user',
        content: toolResults.map(result => ({
          type: 'tool_result',
          tool_use_id: result.tool_use_id,
          content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
        }))
      }
    ];
    return messages;
  }
  
  // Tool definitions for PCS retrieval
  getPcsTools() {
    return [
      {
        name: 'retrieve_decision',
        description: 'Retrieve a previously committed decision from persistent cognitive state',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Query to search for relevant decisions'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'check_policy',
        description: 'Check if a proposed action is allowed by governance policies',
        input_schema: {
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
    ];
  }
  
  // Tool definitions for policy enforcement only (AVS-2P)
  // Flattened schema for consistency with OpenAI/Llama
  getPolicyTools() {
    return [
      {
        name: 'check_policy',
        description: 'Check whether a vendor is allowed for a procurement recommendation. Returns ALLOW or DENY.',
        input_schema: {
          type: 'object',
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
    ];
  }
}

module.exports = AnthropicProvider;
