# Iron Frontier - Android Store Preparation

## Package
- Application ID: com.ironfrontier.game
- Target: Android / Google Play

## Before publication
1. Host the dashboard and API over HTTPS.
2. Replace local API calls with the HTTPS backend URL.
3. Add a signed privacy policy URL.
4. Create a 512 px store icon and feature graphic.
5. Capture phone screenshots in portrait and landscape.
6. Create and configure an Android keystore.
7. Upload the signed Android App Bundle (.aab).
8. Complete Google Play Data Safety and account verification.

## Local build
Use tools/node/node-v22.21.1-win-x64/npm.cmd install
Use tools/node/node-v22.21.1-win-x64/npx.cmd cap sync android
