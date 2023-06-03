import * as wss from './wss.js'
import * as constants from './constants.js'
import * as ui from './ui.js'

let connectedUserDetails

export const sendPreOffer = (callType, calleePersonalCode) => {
  const data = {
    callType,
    calleePersonalCode
  }
  wss.sendPreOffer(data)
}

export const handlerOffer = (data) => {
  console.log('pre offer came webRTC handler')
  console.log(data)
  const { callType, calleeSocketId } = data

  connectedUserDetails = {
    socketId: calleeSocketId,
    callType
  }

  if (
    callType === constants.callType.CHAT_PERSONAL_CODE ||
    callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    console.log('showing call dialog')
    ui.showIncomingCallDialog(callType, acceptCallHandler, rejectcallHandler)
  }
}

const acceptCallHandler = () => {
  console.log('call accepted')
}

const rejectcallHandler = () => {
  console.log('call rejected')
}
