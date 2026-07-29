const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const config = require('../config');
const paths = require('../paths');

class SchemaValidator {
  constructor() {
    // Initialize AJV immediately
    this.ajv = new Ajv({ 
      strict: false, 
      allErrors: true,
      validateFormats: false
    });
    addFormats(this.ajv);
    
    // Pre-load and compile schema
    const schemaPath = config.getSchemaPath('tool-trace.schema.json');
    const schema = paths.readJson(schemaPath);
    
    // Remove $schema reference to avoid meta-schema issues
    delete schema.$schema;
    
    this.validate = this.ajv.compile(schema);
  }
  
  validateToolTrace(toolTrace) {
    const valid = this.validate(toolTrace);
    
    return {
      valid,
      errors: this.validate.errors || []
    };
  }
}

module.exports = new SchemaValidator();
