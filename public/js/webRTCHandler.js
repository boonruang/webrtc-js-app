import * as wss from './wss.js'
import * as constants from './constants.js'
import * as ui from './ui.js'
import * as store from './store.js'

let connectedUserDetails
let peerConnection
let dataChannel

const defaultConstraints = {
  audio: true,
  video: true
}

const configuration = {
  iceServer: [
    {
      urls: 'stun:stun:l.google.com:13902'
    }
  ]
}

export const getLocalPreview = () => {
  navigator.mediaDevices
    .getUserMedia(defaultConstraints)
    .then((stream) => {
      ui.updateLocalVideo(stream)
      ui.showVideoCallButtons()
      store.setCallState(constants.callState.CALL_AVAILABLE)
      store.setLocalStream(stream)
    })
    .catch((err) => {
      console.log('error occured when trying to get an access to camera')
      console.log(err)
    })
}

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(configuration)

  dataChannel = peerConnection.createDataChannel('chat')

  peerConnection.ondatachannel = (event) => {
    const dataChannel = event.channel

    dataChannel.open = () => {
      console.log('peer connection is ready to receive data channel message')
    }

    dataChannel.onmessage = (event) => {
      console.log('message came from data channel')
      const message = JSON.parse(event.data)
      // console.log(message)
      ui.appendMessage(message)
    }
  }

  peerConnection.onicecandidate = (event) => {
    console.log('geeting ice candidates from stun server')
    if (event.candidate) {
      // send our ice candidates to other peer
      wss.sendDataUsingWebRTCSignaling({
        connectedUserSocketId: connectedUserDetails.socketId,
        type: constants.webRTCSignaling.ICE_CANDIDATE,
        candidate: event.candidate
      })
    }
  }

  peerConnection.onconnectionstatechange = (event) => {
    if (peerConnection.connectionState === 'connected') {
      console.log('successfully connected with other peer')
    }
  }

  // receiving tracks
  const remoteStream = new MediaStream()
  store.setRemoteStream(remoteStream)
  ui.updateRemoteVideo(remoteStream)

  peerConnection.ontrack = (event) => {
    remoteStream.addTrack(event.track)
  }

  // add our strem to peer connection
  if (
    connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE ||
    connectedUserDetails.callType === constants.callType.VIDEO_STRANGER
  ) {
    const localStream = store.getState().localStream

    for (const track of localStream.getTracks()) {
      peerConnection.addTrack(track, localStream)
    }
  }
}

export const sendMessageUsingDataChannel = (message) => {
  const stringifiedMessage = JSON.stringify(message)
  dataChannel.send(stringifiedMessage)
}

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
    store.setCallState(constants.callState.CALL_UNAVAILABLE)
    wss.sendPreOffer(data)
  }

  if (
    callType === constants.callType.CHAT_STRANGER ||
    callType === constants.callType.VIDEO_STRANGER
  ) {
    const data = {
      callType,
      calleePersonalCode
    }
    store.setCallState(constants.callState.CALL_UNAVAILABLE)
    wss.sendPreOffer(data)
  }
}

export const handlerPreOffer = (data) => {
  console.log('pre offer came webRTC handler')
  console.log(data)

  const { callType, callerSocketId } = data

  if (!checkCallPossibility()) {
    return sendPreOfferAnswer(
      constants.preOfferAnswer.CALL_UNAVAILABLE,
      callerSocketId
    )
  }

  connectedUserDetails = {
    socketId: callerSocketId,
    callType
  }

  store.setCallState(constants.callState.CALL_UNAVAILABLE)

  if (
    callType === constants.callType.CHAT_PERSONAL_CODE ||
    callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    console.log('showing call dialog')
    ui.showIncomingCallDialog(callType, acceptCallHandler, rejectCallHandler)
  }

  if (
    callType === constants.callType.CHAT_STRANGER ||
    callType === constants.callType.VIDEO_STRANGER
  ) {
    createPeerConnection()
    sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED)
    ui.showCallElements(connectedUserDetails.callType)
  }
}

const acceptCallHandler = () => {
  console.log('call accepted')
  createPeerConnection()
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED)
  ui.showCallElements(connectedUserDetails.callType)
}

const rejectCallHandler = () => {
  console.log('call rejected')
  sendPreOfferAnswer()
  setIncommingCallsAvailable()
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_REJECTED)
}

const callingDialogRejectCallHandler = () => {
  console.log('rejecting the call')
  const data = {
    connectedUserSocketId: connectedUserDetails.socketId
  }
  closePeerConnectionAndResetState()

  wss.sendUserHangUp(data)
}

const sendPreOfferAnswer = (preOfferAnswer, callerSocketId = null) => {
  const socketId = callerSocketId
    ? callerSocketId
    : connectedUserDetails.socketId
  const data = {
    callerSocketId: socketId,
    preOfferAnswer
  }
  ui.removeAllDialogs()
  wss.sendPreOfferAnswer(data)
}

export const handlerPreOfferAnswer = (data) => {
  const { preOfferAnswer } = data
  // console.log('pre offer answer came')
  // console.log(data)
  ui.removeAllDialogs()

  if (preOfferAnswer === constants.preOfferAnswer.CALLEE_NOT_FOUND) {
    ui.showInfoDialog(preOfferAnswer)
    setIncommingCallsAvailable()
    // show dialog that callee has not been found
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_UNAVAILABLE) {
    setIncommingCallsAvailable()
    ui.showInfoDialog(preOfferAnswer)
    // show dialog that caller is not able to connect
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_REJECTED) {
    setIncommingCallsAvailable()
    ui.showInfoDialog(preOfferAnswer)
    // show dialog that call is rejected by the callee
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_ACCEPTED) {
    ui.showCallElements(connectedUserDetails.callType)
    createPeerConnection()
    // send webRTC offer
    sendWebRTCOffer()
  }
}

const sendWebRTCOffer = async () => {
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  wss.sendDataUsingWebRTCSignaling({
    connectedUserSocketId: connectedUserDetails.socketId,
    type: constants.webRTCSignaling.OFFER,
    offer: offer
  })
}

export const handlerWebRTCOffer = async (data) => {
  // console.log('web RTC offer came')
  // console.log(data)
  await peerConnection.setRemoteDescription(data.offer)
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  wss.sendDataUsingWebRTCSignaling({
    connectedUserSocketId: connectedUserDetails.socketId,
    type: constants.webRTCSignaling.ANSWER,
    answer: answer
  })
}

export const handlerWebRTCAnswer = async (data) => {
  console.log('handling webRTC Answer')
  await peerConnection.setRemoteDescription(data.answer)
}

export const handlerWebRTCCandidate = async (data) => {
  console.log('handling incomming webRTC Candidate')
  try {
    await peerConnection.addIceCandidate(data.candidate)
  } catch (err) {
    console.log('error occured when trying to add received ice candidate', err)
  }
}

let screenSharingStream

export const switchForScreenSharingButton = async (screenSharingActive) => {
  if (screenSharingActive) {
    const localStream = store.getState().localStream
    const senders = peerConnection.getSenders()

    const sender = senders.find((sender) => {
      return sender.track.kind === localStream.getVideoTracks()[0].kind
    })

    if (sender) {
      sender.replaceTrack(localStream.getVideoTracks()[0])
    }

    // stop screen sharing stream

    store
      .getState()
      .screenSharingStream.getTracks()
      .forEach((track) => track.stop())

    store.setScreenSharingActive(!screenSharingActive)

    ui.updateLocalVideo(localStream)
  } else {
    console.log('switching for screen sharing')
    try {
      screenSharingStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      })
      store.setScreenSharingStream(screenSharingStream)

      // replace track which sender is sending
      const senders = peerConnection.getSenders()

      const sender = senders.find((sender) => {
        return (
          sender.track.kind === screenSharingStream.getVideoTracks()[0].kind
        )
      })

      if (sender) {
        sender.replaceTrack(screenSharingStream.getVideoTracks()[0])
      }

      store.setScreenSharingActive(!screenSharingActive)

      ui.updateLocalVideo(screenSharingStream)
    } catch (err) {
      console.error(
        'error occured when trying to get screen sharing stream',
        err
      )
    }
  }
}

// hang up
export const handleHangUp = () => {
  console.log('fishing the call')
  const data = {
    connectedUserSocketId: connectedUserDetails.socketId
  }

  wss.sendUserHangUp(data)
  closePeerConnectionAndResetState()
}

export const handleConnectedUserHangedUp = () => {
  // console.log('conneceted peer hanged up')
  closePeerConnectionAndResetState()
}

const closePeerConnectionAndResetState = () => {
  if (peerConnection) {
    peerConnection.close()
    peerConnection.null
  }

  // active mic and camera
  if (
    connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE ||
    connectedUserDetails.callType === constants.callType.VIDEO_STRANGER
  ) {
    store.getState().localStream.getVideoTracks()[0].enabled = true
    store.getState().localStream.getAudioTracks()[0].enabled = true
  }

  ui.updatedUIAfterHangUp(connectedUserDetails.callType)
  setIncommingCallsAvailable()
  connectedUserDetails = null
}

const checkCallPossibility = (callType) => {
  const callState = store.getState().callState

  if (callState === constants.callState.CALL_AVAILABLE) {
    return true
  }

  if (
    callType === constants.callType.VIDEO_PERSONAL_CODE ||
    (callType === constants.callType.VIDEO_STRANGER &&
      callState === constants.callState.CALL_AVAILABLE_ONLY_CHAT)
  ) {
    return false
  }

  return false
}

const setIncommingCallsAvailable = () => {
  const localStream = store.getState().localStream
  if (localStream) {
    store.setCallState(constants.callState.CALL_AVAILABLE)
  } else {
    store.setCallState(constants.callState.CALL_AVAILABLE_ONLY_CHAT)
  }
}
