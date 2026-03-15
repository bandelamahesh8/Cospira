import fs from 'fs';

const filePath = 'c:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\COSPIRA_MAIN\\src\\components\\AnimatedRoutes.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace standard structure
content = content.replace(/<Loader>\s*<PageTransition([^>]*)>/g, '<PageTransition$1>\n              <Loader>');
content = content.replace(/<\/PageTransition>\s*<\/Loader>/g, '</Loader>\n              </PageTransition>');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed AnimatedRoutes order');
