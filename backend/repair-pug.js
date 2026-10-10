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
      newLine = newLine.replace(/\(class="([^"]*)"\)([:\.][a-zA-Z0-9_:\-\.\/\[\]\%]+)/, (match, classes, tail) => {
        let newClasses = classes;
        let t = tail;
        if (t.startsWith(':')) {
           let firstDot = t.indexOf('.');
           if (firstDot === -1) {
             newClasses += t;
             t = '';
           } else {
             newClasses += t.substring(0, firstDot);
             t = t.substring(firstDot);
           }
        }
        
        t = t.replace(/\./g, ' ').trim();
        if (t) newClasses += ' ' + t;
        
        newClasses = newClasses.replace(/\s+/g, ' ').trim();
        
        return `(class="${newClasses}")`;
      });
    } while (oldLine !== newLine);
    
    return newLine;
  });
  
  fs.writeFileSync(filepath, finalLines.join('\n'), 'utf8');
  console.log('Repaired', filepath);
});
