const fs = require('fs');
const path = require('path');

class Paths {
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  ensureRunDir(runPath) {
    this.ensureDir(runPath);
    this.ensureDir(path.join(runPath, 'outputs'));
  }
  
  readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }
  
  readJson(filePath) {
    return JSON.parse(this.readFile(filePath));
  }
  
  writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  writeJson(filePath, data) {
    this.writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
  }
}

module.exports = new Paths();
