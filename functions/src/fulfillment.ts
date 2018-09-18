import { smarthome } from 'actions-on-google'
import { inspect } from 'util'

import db from './db'

const app = smarthome({})

const authorizationHeaderRexExp = new RegExp('^Bearer (.+)$')

const determineUser = async (headers) => {
  const header = headers.authorization
  if (!header) {
    return null
  }

  const match = authorizationHeaderRexExp.exec(header)
  if (match.length !== 2) {
    return null
  }

  const accessToken = match[1]

  const accessTokenRef = db.collection('access_tokens').doc(accessToken)

  const doc = await accessTokenRef.get()

  if (!doc.exists) {
    return null
  }

  return doc.data().uid
}

const determineUserMiddleware = (fn) => {
  return async (body, headers) => {
    const uid = await determineUser(headers)
    if (!uid) {
      return {
        requestId: body.requestId,
        payload: {
          errorCode: 'authFailure'
        }
      }
    }

    return fn(body, headers, uid)
  }
}

app.onDisconnect(determineUserMiddleware((body, headers) => {
  console.log(headers, inspect(body, { depth: Infinity }))

  // User unlinked their account, stop reporting state for user
  return {}
}))

app.onExecute(determineUserMiddleware(async (body, headers, uid) => {
  console.log(headers, inspect(body, { depth: Infinity }))

  const commands = []

  for (const input of body.inputs) {
    for (const command of input.payload.commands) {
      for (const targetDevice of command.devices) {
        // TODO: Optimize to make only a single query
        const deviceRef = db.collection('devices').doc(targetDevice.id)
        const doc = await deviceRef.get()
        if (!doc.exists || doc.data().uid !== uid) {
          commands.push({
            ids: [targetDevice.id],
            status: "ERROR",
            errorCode: 'deviceNotFound'
          })
        }
        
        for (const execution of command.execution) {
          if (execution.command === 'action.devices.commands.OnOff') {
            await deviceRef.update({
              'states.on': execution.params.on
            })

            commands.push({
              "ids": [targetDevice.id],
              "status": "SUCCESS",
              "states": {
                "on": execution.params.on,
                "online": true
              }
            })
          } else if (execution.command === 'action.devices.commands.ColorAbsolute') {
            await deviceRef.update({
              'states.color': execution.params.color
            })

            commands.push({
              "ids": [targetDevice.id],
              "status": "SUCCESS",
              "states": {
                "color": execution.params.color
              }
            })
          } else if (execution.command === 'action.devices.commands.BrightnessAbsolute') {
            await deviceRef.update({
              'states.brightness': execution.params.brightness
            })

            commands.push({
              "ids": [targetDevice.id],
              "status": "SUCCESS",
              "states": {
                "brightness": execution.params.brightness
              }
            })
          }
        }
      }
    }
  }

  return {
    requestId: body.requestId,
    payload: {
      commands
    },
  }
}))

app.onQuery(determineUserMiddleware((body, headers) => {
  console.log(headers, inspect(body, { depth: Infinity }))

  return {
    requestId: body.requestId,
    payload: {
      devices: {}
    },
  }
}))

app.onSync(determineUserMiddleware(async (body, headers, uid) => {
  console.log(headers, inspect(body, { depth: Infinity }))

  const querySnapshot = await db.collection('devices').where("uid", "==", uid).get()

  const devices = querySnapshot.docs.map(function (doc) {
    const data = doc.data()
    return {
      id: doc.id,
      type: data.type,
      traits: data.traits,
      name: data.name,
      willReportState: data.willReportState
    }
  })

  return {
    requestId: body.requestId,
    payload: {
      agentUserId: uid,
      devices
    },
  }
}))

export default app
