install nodejs 13 for windows - https://nodejs.org/en/download/current/

checkout repo

```
npm install frida-mono-api
npm install frida-inject
```

replace "node_modules\frida-mono-api\src\mono-api.js"        with https://raw.githubusercontent.com/GoSecure/frida-mono-api/extra/src/mono-api.js
replace "node_modules\frida-mono-api\src\mono-api-helper.js" with https://raw.githubusercontent.com/GoSecure/frida-mono-api/extra/src/mono-api-helper.js

```
node injector.js 198X.exe enumerator-test.js
```
