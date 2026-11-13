import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files=new Set(['index.html','styles.css','app.js','calendar.js']);
const types={html:'text/html',css:'text/css',js:'text/javascript'};
const port=Number(process.env.PORT||3210);
const server=http.createServer(async(req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!files.has(file)){res.writeHead(404);return res.end('Not found');}
  try{res.setHeader('Content-Type',`${types[file.split('.').pop()]}; charset=utf-8`);res.setHeader('Cache-Control','no-store');res.end(await readFile(`public/${file}`));}catch{res.writeHead(500);res.end('Unable to load page');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
