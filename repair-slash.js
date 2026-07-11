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
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');
  
  const lines = content.split('\n');
  const finalLines = lines.map(line => {
    let newLine = line;
    let oldLine;
    do {
      oldLine = newLine;
      newLine = newLine.replace(/\(class="([^"]*)"\)(\/[0-9]+[a-zA-Z0-9_:\-\.\/\[\]\%]*)/, (match, classes, tail) => {
        let firstDot = tail.indexOf('.');
        let slashPart = firstDot === -1 ? tail : tail.substring(0, firstDot);
        let rest = firstDot === -1 ? '' : tail.substring(firstDot);
        
        let newClasses = classes.trimRight() + slashPart;
        
        rest = rest.replace(/\./g, ' ').trim();
        if (rest) newClasses += ' ' + rest;
        
        newClasses = newClasses.replace(/\s+/g, ' ').trim();
        
        return `(class="${newClasses}")`;
      });
    } while (oldLine !== newLine);
    
    return newLine;
  });
  
  fs.writeFileSync(filepath, finalLines.join('\n'), 'utf8');
  console.log('Repaired slashes', filepath);
});
