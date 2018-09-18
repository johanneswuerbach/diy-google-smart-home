# DIY Google Smart Home

Connect and control your DIY Raspberry Pi gadgets (lights etc.) with Google Assistent / Google Home.

Setup Smart Home project:
* Create smart home project https://console.actions.google.com/project/
* Configure Account linking
  * "Yes, allow users to sign up for new accounts via voice"
  * "OAuth & Google Sign-In"
  * "Implicit"
  * Choose a client id
  * Use https://{PROJECT_ID}.firebaseapp.com/ as "Authorization URL" and "Token URL"
  * Nothing for configuration
  * Write "nothing" into testing instructions
* Configure actions
  * https://us-central1-{PROJECT_ID}.cloudfunctions.net/fulfillment
  * Hit "Test"

Deploy firebase code
* Enable https://console.firebase.google.com/project/{PROJECT_ID}/database
  * Start in locked mode
* Configure firebase `firebase functions:config:set diy.client_id={CLIENT_ID_FROM_ABOVE}`
* `firebase deploy`

* Go to https://console.firebase.google.com/project/diy-smart-home-52801/authentication/providers and enable "Google"
