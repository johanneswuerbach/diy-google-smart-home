import { smarthome, SmartHomeV1Request, Headers, SmartHomeV1Response, SmartHomeV1ExecuteResponseCommands, SmartHomeV1ExecuteErrors } from 'actions-on-google'
import { inspect } from 'util'

import db from './db'
import { firestore } from 'firebase-admin'

const app = smarthome({})

const authorizationHeaderRexExp = new RegExp('^Bearer (.+)$')

const determineUser = async (headers: Headers) => {
  let header = headers.authorization
  if (!header) {
    return null
  }

  if (header instanceof Array) {
    header = header[0]
  }

  const match = authorizationHeaderRexExp.exec(header)
  if (!match || match.length !== 2) {
    return null
  }

  const accessToken = match[1]

  const accessTokenRef = db.collection('access_tokens').doc(accessToken)

  const doc = await accessTokenRef.get()

  if (!doc.exists) {
    return null
  }

  return (<firestore.DocumentData> doc.data()).uid
}


const CONSIDER_OFFLINE_AFTER = 90000
const isOnline = (data: firestore.DocumentData | undefined): boolean => {
  if (!data) {
    return false
  }

  return Date.now() - (data.lastSeen || 0) < CONSIDER_OFFLINE_AFTER
}

interface Handler<TRequest extends SmartHomeV1Request, TResponse extends SmartHomeV1Response> {
  (body: TRequest, headers: Headers, uid: string): TResponse | Promise<TResponse>
}

function determineUserMiddleware<TRequest extends SmartHomeV1Request, TResponse extends SmartHomeV1Response> (fn: Handler<TRequest, TResponse>) {
  return async (body: TRequest, headers: Headers) => {
    const uid = await determineUser(headers)

    return fn(body, headers, uid)
  }
}

app.onDisconnect(determineUserMiddleware((body, headers, uid) => {
  if (!uid) {
    return {
      requestId: body.requestId
    }
  }

  console.log(headers, inspect(body, { depth: Infinity }))

  // User unlinked their account, stop reporting state for user
  return {}
}))

app.onExecute(determineUserMiddleware(async (body, headers, uid) => {
  const commands : SmartHomeV1ExecuteResponseCommands[] = []

  if (!uid) {
    const errorCode : SmartHomeV1ExecuteErrors = 'authFailure'
    return {
      requestId: body.requestId,
      payload: {
        errorCode,
        commands
      }
    }
  }

  console.log(headers, inspect(body, { depth: Infinity }))

  for (const input of body.inputs) {
    for (const command of input.payload.commands) {
      for (const targetDevice of command.devices) {
        const deviceRef = db.collection('devices').doc(targetDevice.id)
        const doc = await deviceRef.get()
        const data = doc.data()
        if (!doc.exists || !data || data.uid !== uid) {
          commands.push({
            ids: [targetDevice.id],
            status: 'ERROR',
            errorCode: 'deviceNotFound'
          })
        }

        for (const execution of command.execution) {
          if (execution.command === 'action.devices.commands.OnOff') {
            await deviceRef.update({
              'states.on': execution.params.on
            })

            commands.push({
              'ids': [targetDevice.id],
              'status': 'SUCCESS',
              'states': {
                'online': isOnline(data),
                'on': execution.params.on
              }
            })
          } else if (execution.command === 'action.devices.commands.ColorAbsolute') {
            await deviceRef.update({
              'states.color': execution.params.color
            })

            commands.push({
              'ids': [targetDevice.id],
              'status': 'SUCCESS',
              'states': {
                'online': isOnline(data),
                'color': execution.params.color
              }
            })
          } else if (execution.command === 'action.devices.commands.BrightnessAbsolute') {
            await deviceRef.update({
              'states.brightness': execution.params.brightness
            })

            commands.push({
              'ids': [targetDevice.id],
              'status': 'SUCCESS',
              'states': {
                'online': isOnline(data),
                'brightness': execution.params.brightness
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

app.onQuery(determineUserMiddleware(async (body, headers, uid) => {
  const devices: { [key:string]:any; } = {}

  if (!uid) {
    return {
      requestId: body.requestId,
      payload: {
        errorCode: 'authFailure',
        devices
      },
    }
  }

  console.log(headers, inspect(body, { depth: Infinity }))

  for (const input of body.inputs) {
    const payload = input.payload
    const devicesForInput: { [key:string]:any; } = {}

    await Promise.all(payload.devices.map(async (device) => {
      const doc = await db.collection('devices').doc(device.id).get()
      const data = doc.data()

      if (!data) {
        devicesForInput[device.id] = { online: false }
        return
      }

      devicesForInput[device.id] = Object.assign({ online: isOnline(data) }, data.states)
      return
    }))

    Object.assign(devices, devicesForInput)
  }

  return {
    requestId: body.requestId,
    payload: {
      devices
    },
  }
}))

app.onSync(determineUserMiddleware(async (body, headers, uid) => {
  if (!uid) {
    return {
      requestId: body.requestId,
      payload: {
        errorCode: 'authFailure',
        devices: []
      },
    }
  }

  console.log(headers, inspect(body, { depth: Infinity }))

  const querySnapshot = await db.collection('devices').where('uid', '==', uid).get()

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
