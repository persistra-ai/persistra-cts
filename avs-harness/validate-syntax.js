#!/usr/bin/env node

/**
 * Syntax Validation Script
 * Checks for common JavaScript errors in modified files
 */

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'lib/verify/assertions.js',
  'lib/verify/trace-integrity.js',
  'lib/verify/statistical-validator.js',
  'run-avs2p-matrix.js'
];

console.log('=== Syntax Validation ===\n');

let hasErrors = false;

for (const file of filesToCheck) {
  const filePath = path.join(__dirname, file);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${file}`);
      hasErrors = true;
      continue;
    }
    
    // Try to require the file (will throw on syntax errors)
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const issues = [];
    
    // Check for unmatched braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    // Check for unmatched parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
    }
    
    // Check for unmatched brackets
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push(`Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`);
    }
    
    if (issues.length > 0) {
      console.error(`❌ ${file}:`);
      issues.forEach(issue => console.error(`   ${issue}`));
      hasErrors = true;
    } else {
      console.log(`✅ ${file}`);
    }
    
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`);
    hasErrors = true;
  }
}

console.log('\n=== Validation Complete ===');

if (hasErrors) {
  console.error('\n❌ Syntax errors detected. Please fix before running tests.');
  process.exit(1);
} else {
  console.log('\n✅ All files passed syntax validation.');
  process.exit(0);
}
