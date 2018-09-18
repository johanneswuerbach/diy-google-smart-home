import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

import db from './db'
import randomString from './random-string'

const CLIENT_ID = functions.config().diy.client_id
const PROJECT_ID = process.env.GCLOUD_PROJECT
  
export default async (request, response) => {
  if (request.method !== "POST") {
    console.error(`Got unsupported ${request.method} request. Expected POST.`)
    return response.status(400).send({"error": "invalid_grant"})
  }

  const { clientId, redirectUri, idToken } = request.body

  if (clientId !== CLIENT_ID) {
    console.error(`Invalid client_id: "${clientId}"`)
    return response.status(401).send(`Invalid clientId`)
  }

  if (redirectUri !== `https://oauth-redirect.googleusercontent.com/r/${PROJECT_ID}`) {
    console.error(`Invalid redirect_uri: "${redirectUri}"`)
    return response.status(401).send(`Invalid redirectUri`)
  }

  let decodedToken: admin.auth.DecodedIdToken
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken)
  } catch (e) {
    console.error(`Invalid token`, e)
    return response.status(401).send(`Invalid idToken`)
  } 
  
  try {
    const accessToken = randomString()
    const accessTokenRef = db.collection('access_tokens').doc(accessToken)
    await accessTokenRef.create({
      uid: decodedToken.uid,
      createdAt: Date.now()
    })

    return response.send({
      "tokenType": "bearer",
      "accessToken": accessToken,
    })
  } catch (e) {
    console.error(`Failed generating access token`, e)
    return response.status(401).send(`Token generation failure`)
  } 
}
