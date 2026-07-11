import fs from 'fs';
import path from 'path';

const files = [
  'views/base.pug',
  'views/error.pug',
  'views/_mixins.pug',
  'views/overview.pug',
  'views/myRentals.pug',
  'views/login.pug',
  'views/forgotPassword.pug',
  'views/car.pug',
  'views/account.pug'
];

files.forEach(file => {
  const filepath = path.join(process.cwd(), file);
  if (!fs.existsSync(filepath)) {
      console.log('Missing', filepath);
      return;
  }
  let content = fs.readFileSync(filepath, 'utf8');
  
  const lines = content.split('\n');
  let finalContent = lines.map(line => {
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    let trimmed = line.trim();
    
    if (!/^[a-zA-Z\.#]/.test(trimmed)) return line;
    
    const match = trimmed.match(/^([a-zA-Z0-9_\-#\.\\]+)(.*)$/);
    if (!match) return line;
    
    let tagDef = match[1];
    let rest = match[2];
    
    if (!tagDef.includes('\\')) return line;
    
    let tag = '';
    let id = '';
    let classList = [];
    
    let tokens = tagDef.split(/(?<!\\)([.#])/);
    
    if (tokens.length > 0 && tokens[0] !== '' && tokens[0] !== '.' && tokens[0] !== '#') {
      tag = tokens[0];
    }
    
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '.') {
        classList.push(tokens[i+1].replace(/\\/g, ''));
      } else if (tokens[i] === '#') {
        id = tokens[i+1].replace(/\\/g, '');
      }
    }
    
    if (tag === '' && classList.length > 0) tag = 'div';
    
    let newTagDef = tag;
    if (id) newTagDef += `#${id}`;
    
    if (classList.length > 0) {
      const classAttr = `class="${classList.join(' ')}"`;
      if (rest.startsWith('(')) {
         rest = '(' + classAttr + ', ' + rest.substring(1);
      } else {
         rest = '(' + classAttr + ')' + rest;
      }
    }
    
    return indent + newTagDef + rest;
    
  }).join('\n');
  
  fs.writeFileSync(filepath, finalContent, 'utf8');
  console.log('Fixed', filepath);
});
