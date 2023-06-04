import * as wss from './wss.js'
import * as constants from './constants.js'
import * as ui from './ui.js'

let connectedUserDetails

export const sendPreOffer = (callType, calleePersonalCode) => {
  connectedUserDetails = {
    callType,
    socketId: calleePersonalCode
  }

  if (
    callType === constants.callType.CHAT_PERSONAL_CODE ||
    callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    const data = {
      callType,
      calleePersonalCode
    }
    ui.showCallingDialog(callingDialogRejectCallHandler)
    wss.sendPreOffer(data)
  }
}

export const handlerPreOffer = (data) => {
  console.log('pre offer came webRTC handler')
  console.log(data)
  const { callType, callerSocketId } = data

  connectedUserDetails = {
    socketId: callerSocketId,
    callType
  }

  if (
    callType === constants.callType.CHAT_PERSONAL_CODE ||
    callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    console.log('showing call dialog')
    ui.showIncomingCallDialog(callType, acceptCallHandler, rejectCallHandler)
  }
}

const acceptCallHandler = () => {
  console.log('call accepted')
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED)
}

const rejectCallHandler = () => {
  console.log('call rejected')
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_REJECTED)
}

const callingDialogRejectCallHandler = () => {
  console.log('rejecting the call')
}

const sendPreOfferAnswer = (preOfferAnswer) => {
  console.log('sendPreOfferAnswer came')
  const data = {
    callerSocketId: connectedUserDetails.socketId,
    preOfferAnswer
  }
  console.log(data)
  wss.sendPreOfferAnswer(data)
}
