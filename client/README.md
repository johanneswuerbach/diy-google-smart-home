Example client to control a lightstrip wired as shown in https://dordnung.de/raspberrypi-ledstrip/

Prepare
* Visit https://console.firebase.google.com/
* Choose your project
* Click Authentication ~> Web setup
* Note `apiKey`, `authDomain` and `projectId`
* Visit https://console.cloud.google.com/apis/credentials
  * Create OAuth client ID
  * Choose "Application type" "Other"
  * Note `client id` and `client secret`

Run the client with (replace the values in ${} before)

```
docker pull johanneswuerbach/diy-google-smart-home-client && \
docker run --rm \
  --cap-add SYS_RAWIO \
  --device /dev/mem \
  --device /dev/vcio \
  -v $(pwd)/client_config:/root/config \
  -e API_KEY="${API_KEY}" \
  -e AUTH_DOMAIN="${AUTH_DOMAIN}"
  -e PROJECT_ID="${PROJECT_ID}" \
  -e CLIENT_ID="${CLIENT_ID}" \
  -e CLIENT_SECRET="${CLIENT_SECRET}" \
  -e CONFIG_FILE=/root/config/config.json \
  \
  johanneswuerbach/diy-google-smart-home-client
```
