PS D:\Project\library> 
                       ^C
PS D:\Project\library> pnpm dev

> ai-library@0.1.0 dev D:\Project\library
> cross-env NODE_ENV=development next dev -p 3007

 ⚠ `images.domains` is deprecated in favor of `images.remotePatterns`. Please update next.config.js to protect your application from malicious users.
   ▲ Next.js 16.0.10 (Turbopack)
   - Local:         http://localhost:3007
   - Network:       http://192.168.2.71:3007
   - Environments: .env.development

 ✓ Starting...
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
 ⚠ Minimum recommended TypeScript version is v5.1.0, older versions can potentially be incompatible with Next.js. Detected: 5.0.2
 ✓ Ready in 1293ms
[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
 ○ Compiling /_error ...
 GET / 200 in 1392ms (compile: 1346ms, render: 46ms)
 GET /dashboard/knowledge 404 in 4.3s (compile: 4.2s, render: 36ms)
warn: 登录信息已过期,请重新登录 {"service":"ai-library","statusCode":401,"timestamp":"2026-04-30 14:54:45"}
error: GET /api/auth/check - 401 - 9ms {"duration":9,"ip":"::1","method":"GET","path":"/api/auth/check","service":"ai-library","statusCode":401,"timestamp":"2026-04-30 14:54:45"}
 GET /api/auth/check 401 in 331ms (compile: 301ms, render: 30ms)
warn: 登录信息已过期,请重新登录 {"service":"ai-library","statusCode":401,"timestamp":"2026-04-30 14:54:45"}
error: GET /api/auth/check - 401 - 5ms {"duration":5,"ip":"::1","method":"GET","path":"/api/auth/check","service":"ai-library","statusCode":401,"timestamp":"2026-04-30 14:54:45"}
 GET /api/auth/check 401 in 21ms (compile: 11ms, render: 10ms)
 GET /login?redirect=%2F 200 in 286ms (compile: 268ms, render: 17ms)
info: Business Operation Started {"loginMethod":"password","operation":"user_login","phoneNumber":"185****9010","service":"ai-library","timestamp":"2026-04-30 14:55:10"}
info: API Handler Started: POST /api/auth/login {"metadata":{"loginMethod":"password","phoneNumber":"185****9010"},"service":"ai-library","timestamp":"2026-04-30 14:55:10"}
info: 登录成功 {"method":"password","service":"ai-library","timestamp":"2026-04-30 14:55:11","userId":"421b3e88-9338-4343-9d3a-8a548d817f55"}
info: Business Operation Completed {"duration":150,"loginMethod":"password","operation":"user_login","phoneNumber":"185****9010","service":"ai-library","timestamp":"2026-04-30 14:55:11"}
info: Business Event {"duration":150,"event":"login_success","loginMethod":"password","phoneNumber":"185****9010","service":"ai-library","timestamp":"2026-04-30T06:55:11.100Z"}
info: API Handler Completed: POST /api/auth/login {"duration":150,"metadata":{"loginMethod":"password","phoneNumber":"185****9010"},"service":"ai-library","timestamp":"2026-04-30 14:55:11"}
info: POST /api/auth/login - 200 - 153ms {"duration":153,"ip":"::1","method":"POST","path":"/api/auth/login","service":"ai-library","statusCode":200,"timestamp":"2026-04-30 14:55:11"}
 POST /api/auth/login 200 in 171ms (compile: 13ms, render: 158ms)
 GET / 200 in 20ms (compile: 9ms, render: 10ms)
info: GET /api/auth/check - 200 - 9ms {"duration":9,"ip":"::1","method":"GET","path":"/api/auth/check","service":"ai-library","statusCode":200,"timestamp":"2026-04-30 14:55:11"}
 GET /api/auth/check 200 in 20ms (compile: 4ms, render: 16ms)
info: GET /api/auth/check - 200 - 7ms {"duration":7,"ip":"::1","method":"GET","path":"/api/auth/check","service":"ai-library","statusCode":200,"timestamp":"2026-04-30 14:55:11"}
 GET /api/auth/check 200 in 14ms (compile: 3ms, render: 10ms)
