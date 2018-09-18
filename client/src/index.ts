import * as firebase from "firebase"
import * as pigpio from 'pigpio'
import { promises as fs } from 'fs'
import * as fetch from 'node-fetch'

firebase.initializeApp({
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID
})

const db = firebase.firestore()

db.settings({
  timestampsInSnapshots: true
})

const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

const RED_PIN   = 17
const GREEN_PIN = 22
const BLUE_PIN  = 24 

const CONFIG_FILE = process.env.CONFIG_FILE

const delay = (time) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

const init = async () => {
  const redPin = new pigpio.Gpio(RED_PIN, {mode: pigpio.Gpio.OUTPUT})
  const greenPin = new pigpio.Gpio(GREEN_PIN, {mode: pigpio.Gpio.OUTPUT})
  const bluePin = new pigpio.Gpio(BLUE_PIN, {mode: pigpio.Gpio.OUTPUT})

  let auth
  try {
    const authContent = await fs.readFile(CONFIG_FILE, 'utf8')
    auth = JSON.parse(authContent)
    // TODO: Handle token refresh
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error(e)
      process.exit(1)
    }

    const response = await fetch('https://accounts.google.com/o/oauth2/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `client_id=${clientId}&scope=email%20profile`
    }) 

    if (!response.ok) {
      const body = await response.text()
      console.error(response.status, body)
      process.exit(1)
    }

    const code = await response.json()

    console.log(`Please visit ${code.verification_url} and enter ${code.user_code}`)

    for (let totalWait = 0; totalWait < code.expires_in && !auth; totalWait += code.interval) {
      await delay(code.interval * 1000)

      const tokenResponse = await fetch('https://www.googleapis.com/oauth2/v4/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `client_id=${clientId}&client_secret=${clientSecret}&code=${code.device_code}&grant_type=http://oauth.net/grant_type/device/1.0`
      })

      if (!tokenResponse.ok) {
        const body = await tokenResponse.text()
        console.error(tokenResponse.status, body)
        continue
      }

      const token = await tokenResponse.json()

      if (token.error) {
        console.log(token.error)
        continue
      }

      token.expires_at = Date.now() + token.expires_in
      
      auth = token

      await fs.writeFile(CONFIG_FILE, JSON.stringify(auth), { encoding: 'utf8' })
    }
  }

  try {
    const credential = firebase.auth.GoogleAuthProvider.credential(auth.id_token)
    await firebase.auth().signInAndRetrieveDataWithCredential(credential)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  await db.collection('devices').doc('diy-rpi-light').set({
    type: 'action.devices.types.LIGHT',
    traits: [
      'action.devices.traits.OnOff',
      'action.devices.traits.Brightness',
      'action.devices.traits.ColorSpectrum'
    ],
    name: {
      defaultNames: [],
      name: 'DIY Raspberry Light',
      nicknames: []
    },
    willReportState: false,
    uid: firebase.auth().currentUser.uid
  }, { merge: true })

  const unsubscribe = db.collection('devices').doc('diy-rpi-light').onSnapshot(function(doc) {
    // Ignore changes made at the device
    if (doc.metadata.hasPendingWrites) {
      return
    }
   
    const data = doc.data()

    if (data.states && data.states.on) {
      let red = 255
      let green = 255
      let blue = 255
      
      if (data.states.color) {
        let hex = Number(data.states.color.spectrumRGB).toString(16)

        while (hex.length < 6) {
          hex = '0' + hex
        }

        console.log('Color hex value', hex)

        // Split into pairs of two
        const values = hex.match(/(..?)/g)

        red = parseInt(values[0], 16) 
        green = parseInt(values[1], 16) 
        blue = parseInt(values[2], 16)
      }

      if (data.states.brightness) {
        const correctionFactor = data.states.brightness / 100
        red = Math.round(red * correctionFactor)
        green = Math.round(green * correctionFactor)
        blue = Math.round(blue * correctionFactor)
      }

      console.log(`Setting light to: R: ${red}, G: ${green}, B: ${blue}`)
      
      redPin.pwmWrite(red)
      greenPin.pwmWrite(green)
      bluePin.pwmWrite(blue)  
    } else {
      console.log('Turning light off')

      redPin.pwmWrite(0)
      greenPin.pwmWrite(0)
      bluePin.pwmWrite(0)
    }
  }, function(error) {
    console.error(error)
  })

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGHUP']
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, terminating...`)
      unsubscribe()

      await firebase.app().delete()

      redPin.pwmWrite(0)
      greenPin.pwmWrite(0)
      bluePin.pwmWrite(0)

      pigpio.terminate()
    })
  })
}

init().catch((e) => {
  console.error(e)
  process.exit(1)
})




