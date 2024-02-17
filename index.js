const express = require('express');
const {createServer} = require('http');
const {Server} = require('socket.io');
const path = require('path');
const {join} = require('node:path');
const app = express();
const sqlite3 = require('sqlite3');
const {open} = require('sqlite');
async function main(){
    const db = await open({
        filename: 'chat.db',
        driver: sqlite3.Database
    });
    await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);
const server = createServer(app);
const io = new Server(server,{connectionStateRecovery:{}});
// app.use(express.static(path.resolve("./public")));
io.on('connection',async (socket)=>{
    console.log('a user connected');
    socket.on('chat-message',async (msg)=>{
            let result;
        try {
            // store the message in the database
            result = await db.run('INSERT INTO messages (content) VALUES (?)', msg);
        } catch (e) {
            // TODO handle the failure
            return;
        }
        // include the offset with the message
        io.emit('chat message', msg, result.lastID);
        io.emit('chat-message',msg);
        // socket.broadcast.emit('chat-message',msg);
    })
    socket.on('disconnect',(socket)=>{
        console.log('user disconnected');
    })
    if (!socket.recovered) {
        // if the connection state recovery was not successful
        try {
          await db.each('SELECT id, content FROM messages WHERE id > ?',
            [socket.handshake.auth.serverOffset || 0],
            (_err, row) => {
              socket.emit('chat message', row.content, row.id);
            }
          )
        } catch (e) {
          // something went wrong
        }
      }
})

// io.emit('hello','world');
app.get('/',(req,res)=>{
    res.sendFile(join(__dirname,'index1.html'));
})
server.listen(3000,()=>{
    console.log('server running at localhost');
})
}
main();