import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp(functions.config().firebase)

import fulfillment from './fulfillment'
import token from './token'

exports.fulfillment = functions.https.onRequest(fulfillment)
exports.token = functions.https.onRequest(token)
