import * as constants from './constants.js'
import * as elements from './elements.js'

export const updatePersonalCode = (personalCode) => {
  const personalCodeParagraph = document.getElementById(
    'personal_code_paragraph'
  )
  personalCodeParagraph.innerHTML = personalCode
}

export const showIncomingCallDialog = (
  callType,
  acceptCallHandler,
  rejectcallHandler
) => {
  const callTypeInfo =
    callType === constants.callType.CHAT_PERSONAL_CODE ? 'Chat' : 'Video'

  // let CallTypeInfo
  // if (callType === constants.callType.CHAT_PERSONAL_CODE) {
  //   CallTypeInfo = 'chat'
  //   return 'chat'
  // } else {
  //   CallTypeInfo = 'video'
  //   return 'video'
  // }

  const incomingCallDialog = elements.getIncomingCallDialog(
    callTypeInfo,
    acceptCallHandler,
    rejectcallHandler
  )

  // remove all dialogs inside HTML dialog element
  const dialog = document.getElementById('dialog')
  dialog.querySelectorAll('*').forEach((dialog) => dialog.remove())
  dialog.appendChild(incomingCallDialog)
}
