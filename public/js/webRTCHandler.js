import * as wss from './wss.js'
export const sendPreOffer = (callType, calleePersonalCode) => {
  const data = {
    callType,
    calleePersonalCode
  }
  wss.sendPreOffer(data)
}
