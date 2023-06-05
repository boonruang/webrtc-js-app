import * as store from './store.js'
import * as ui from './ui.js'
import * as webRTCHandler from './webRTCHandler.js'
import * as constants from './constants.js'

let socketIO = null

export const registerSocketEvents = (socket) => {
  socketIO = socket

  socket.on('connect', () => {
    console.log('successfully connected to socket.io server')
    store.setSocketId(socket.id)
    ui.updatePersonalCode(socket.id)
  })

  socket.on('pre-offer', (data) => {
    // console.log('pre offer came')
    webRTCHandler.handlerPreOffer(data)
  })

  socket.on('pre-offer-answer', (data) => {
    webRTCHandler.handlerPreOfferAnswer(data)
  })

  socket.on('webRTC-signaling', (data) => {
    switch (data.type) {
      case constants.webRTCSignaling.OFFER:
        webRTCHandler.handlerWebRTCOffer(data)
        break
      case constants.webRTCSignaling.ANSWER:
        webRTCHandler.handlerWebRTCAnswer(data)
        break
      default:
        return
    }
  })
}

export const sendPreOffer = (data) => {
  console.log('emmitting to server pre offer event')
  socketIO.emit('pre-offer', data)
}

export const sendPreOfferAnswer = (data) => {
  socketIO.emit('pre-offer-answer', data)
}

export const sendDataUsingWebRTCSignaling = (data) => {
  socketIO.emit('webRTC-signaling', data)
}
