const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

//when connection is starts 
io.on('connection', (socket)=>{
    console.log("New websocet connection")
   
    //socket.on('join', ({username, room}, callback) =>{//we can call using spread operator ...
    socket.on('join', (options, callback) =>{    
        const {error, user} = addUser({ id:socket.id, ...options })
        
        if(error){
           return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))//send welcome message when new user connect to server
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))//this is for when new user join and send message to reaming users who already exited
        io.to(user.room).emit('roomData', {
            room:user.room,
            users:getUsersInRoom(user.room)
        })

        callback()
    })
    
    //send message to every one who connected the server
    //sending acknowledgement to client
    socket.on('sendMessage', (message, callback)=>{

        const user = getUser(socket.id)

        const filter = new Filter()
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (location, callback)=>{
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps/?${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on('disconnect', ()=>{
        const user =  removeUser(socket.id)

        if(user){//if any user exists it will send to that users that a user left the room
            io.to(user.room).emit('message', generateMessage(user.username, `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }        
    })
})


server.listen(port, ()=>{
    console.log(`Server is up on port ${300}!`)
}) 