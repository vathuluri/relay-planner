import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','app.js','calendar.js','activity-time.js'])await copyFile(`public/${file}`,`dist/${file}`);
console.log('Built static prototype in dist/');
