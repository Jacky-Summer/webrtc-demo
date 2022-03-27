const Koa = require('koa')
const http = require('http')
const { Server } = require('socket.io')
const EventNames = require('./constants')

const PORT = 3001
const app = new Koa()
const server = http.createServer(app.callback()).listen(PORT, () => {
  console.log(`WebRTC server run at: http://localhost:${PORT}`)
})

const rooms = new Map()
const socketInstances = {}

const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

io.on('connection', (socket) => {
  socket.emit('connected', socket.id)

  // 创建或加入房间
  socket.on(EventNames.CREATE_OR_JOIN_ROOM, (userInfo) => {
    const { roomId, socketId } = userInfo
    const curRoomUsers = rooms.get(roomId) || [] // 获取该房间的用户

    if (curRoomUsers.length >= 2) {
      socket.emit(EventNames.ROOM_FULL, roomId)
      return
    } else if (curRoomUsers.length === 0) {
      socket.join(roomId)
      io.to(roomId).emit(EventNames.ROOM_CREATED)
      rooms.set(roomId, [userInfo])
    } else {
      socket.join(roomId)
      io.to(roomId).emit(EventNames.ROOM_JOINED, userInfo)
      rooms.set(roomId, [...curRoomUsers, userInfo])
    }
    socketInstances[socketId] = socket
  })

  // 发起视频通话
  socket.on(EventNames.REQUEST_VIDEO, (userInfo) => {
    io.in(userInfo.roomId).emit(EventNames.RECEIVE_VIDEO, userInfo)
  })

  // 收到视频通话邀请
  socket.on(EventNames.RECEIVE_VIDEO, (userInfo) => {
    io.in(userInfo.roomId).emit(EventNames.RECEIVE_VIDEO, userInfo)
  })

  // 用户同意接受视频通话
  socket.on(EventNames.ACCEPT_VIDEO, (userInfo) => {
    io.in(userInfo.roomId).emit(EventNames.ACCEPT_VIDEO, userInfo)
  })

  // 收到 offer
  socket.on(EventNames.OFFER, (data) => {
    const { socketId, roomId } = data.userInfo
    const peerUser = rooms.get(roomId).find((item) => item.socketId !== socketId)
    socketInstances[peerUser.socketId].emit(EventNames.RECEIVE_OFFER, data.offer)
  })

  // 收到 answer
  socket.on(EventNames.ANSWER, (data) => {
    const { socketId, roomId } = data.userInfo
    const peerUser = rooms.get(roomId).find((item) => item.socketId !== socketId)
    socketInstances[peerUser.socketId].emit(EventNames.RECEIVE_ANSWER, data.answer)
  })

  socket.on(EventNames.ADD_CANDIDATE, (data) => {
    const { socketId, roomId } = data.userInfo
    const peerUser = rooms.get(roomId).find((item) => item.socketId !== socketId)
    socketInstances[peerUser.socketId].emit(EventNames.ADD_CANDIDATE, data.candidate)
  })
})
