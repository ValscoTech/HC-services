# HC Services Backend

Express.js backend that proxies the Indian High Court eCourts portal (`hcservices.ecourts.gov.in`) for:

- captcha fetching
- party-name search
- case-number search
- case details parsing
- order PDF proxying
- case types and bench lookup

This backend exists because the HC portal is session-based, captcha-protected, and sometimes returns inconsistent or non-user-friendly responses.

## Stack

- Node.js
- Express.js
- Axios
- Cheerio
- Firebase SDK

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in [`.env`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/.env):

```env
PORT=3000

FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_MEASUREMENT_ID=...

HCSERVICES_SESSID=
JSESSION_BENCHES=

ALLOWED_ORIGINS=http://localhost:3000,https://jr-portal.vercel.app
```

3. Start the server:

```bash
node src/server.js
```

or

```bash
npm run dev
```

## Important Migration Notes

This codebase was migrated from a previous monolithic backend into a modular folder structure.

During migration, the main issues were:

- `rgyear` was accidentally changed to `rgyearP` in request handling and outbound HC payloads
- `CSPartyName` did not match the old working HC portal value `CSpartyName`
- portal object responses were incorrectly treated as empty responses
- full Axios `response` objects were returned in JSON and caused circular JSON errors
- order PDF links worked only inside the live HC portal session

All of those are now handled in the current implementation.

## Final Working Workflows

### 1. Party Name Search Workflow

1. Fetch captcha and session cookies
2. Search by party name
3. Pick one row from `data.con`
4. Fetch inner case details
5. Open order PDF through backend proxy

### 2. Case Number Search Workflow

1. Fetch captcha and session cookies
2. Search by case number
3. Pick one row from `data.con`
4. Fetch inner case details
5. Open order PDF through backend proxy

## API List

### Health Check

```txt
GET /health
```

Response:

```json
{ "ok": true }
```

### Fetch Captcha

```txt
POST /api/captcha/highcourt
```

Request body:

```json
{}
```

Response:

```json
{
  "captchaImageBase64": "data:image/png;base64,...",
  "cookies": {
    "HCSERVICES_SESSID": "...",
    "JSESSION": "...",
    "JSESSIONID": "..."
  },
  "sessionId": "..."
}
```

### Party Name Search

```txt
POST /api/search/party-name
```

Final request body:

```json
{
  "captcha": "9e65pl",
  "petres_name": "rahul",
  "rgyear": "2026",
  "caseStatusSearchType": "CSpartyName",
  "f": "Pending",
  "court_code": "1",
  "state_code": "13",
  "court_complex_code": "1",
  "cookies": {
    "JSESSIONID": "86415134",
    "JSESSION": "86415134",
    "HCSERVICES_SESSID": "f78avh0k3digk7f5ih4iiiqmqi"
  },
  "sessionId": "86415134"
}
```

Important notes:

- backend accepts `rgyear`, not `rgyearP`
- if frontend sends `CSPartyName`, backend normalizes it to `CSpartyName`
- HC portal still expects `rgyear` in the outbound form payload

Response:

```json
{
  "sessionID": "...",
  "data": {
    "con": [
      {
        "cino": "UPHC011106372026",
        "case_no": "200300005702026",
        "case_no2": 570,
        "case_type": 3,
        "case_year": 2026,
        "pet_name": "...",
        "res_name": "...",
        "type_name": "FAFO"
      }
    ]
  },
  "cookies": {
    "HCSERVICES_SESSID": "...",
    "JSESSION": "...",
    "JSESSIONID": "..."
  },
  "raw": {}
}
```

### Case Number Search

```txt
POST /api/search/case-number
```

Final request body:

```json
{
  "captcha": "7626mf",
  "caseNoType": "new",
  "caseStatusSearchType": "CScaseNumber",
  "case_no": "570",
  "case_type": "3",
  "court_code": "1",
  "court_complex_code": "1",
  "displayOldCaseNo": "NO",
  "rgyear": "2026",
  "state_code": "13",
  "cookies": {
    "HCSERVICES_SESSID": "rtqqucroj9v0f96jeb9v0v62go",
    "JSESSION": "12367406",
    "JSESSIONID": "12367406"
  }
}
```

Important notes:

- use the serial number in `case_no`, not the long combined case number
- example: use `570`, not `200300005702026`
- use the actual `case_type` returned from search/case-type lookup

Response:

```json
{
  "sessionID": "...",
  "data": {
    "con": [
      {
        "cino": "UPHC011106372026",
        "case_no": "200300005702026",
        "case_no2": 570,
        "case_type": 3,
        "case_year": 2026,
        "type_name": "FAFO"
      }
    ]
  },
  "cookies": {
    "HCSERVICES_SESSID": "...",
    "JSESSION": "...",
    "JSESSIONID": "..."
  },
  "raw": {}
}
```

### Fetch Case Details

```txt
POST /api/case/details/highcourt
```

You can call this in two ways.

#### Option A: Old-style session fields

```json
{
  "appFlag": "",
  "case_no": "570",
  "cino": "UPHC011106372026",
  "court_code": "1",
  "court_complex_code": "1",
  "hcservices_sessid": "oq05fne2npdhj9t5rdgekcs5je",
  "jsession_value": "79235173",
  "state_code": "13"
}
```

#### Option B: Cookies object

```json
{
  "appFlag": "",
  "case_no": "570",
  "cino": "UPHC011106372026",
  "court_code": "1",
  "court_complex_code": "1",
  "state_code": "13",
  "cookies": {
    "HCSERVICES_SESSID": "oq05fne2npdhj9t5rdgekcs5je",
    "JSESSION": "79235173",
    "JSESSIONID": "79235173"
  }
}
```

Important note:

- in this workflow, `case_no` for details may need to come from `case_no2` from the search result
- example:
  - search row `case_no = "200300005702026"`
  - search row `case_no2 = 570`
  - details request uses `case_no = "570"`

Response:

```json
{
  "sessionID": "49496031",
  "data": {
    "caseDetails": {
      "Filing Number": "FAFO /",
      "Registration Number": "FAFO /570/2026",
      "CNR Number": "UPHC01-110637-2026"
    },
    "caseStatus": {
      "Next Hearing Date": "27th February 2026",
      "Bench Type": "Single Bench",
      "Judicial Branch": "Civil Appeal",
      "State": "UTTARPRADESH",
      "District": "FARRUKHABAD"
    },
    "petitionerAdvocate": [],
    "respondentAdvocate": [],
    "hearingHistory": [],
    "orders": [
      {
        "orderNumber": "1",
        "orderOn": "FAFO/570/2026",
        "judge": "PIYUSH AGRAWAL",
        "orderDate": "27-02-2026",
        "orderLink": "https://hcservices.ecourts.gov.in/hcservices/cases/display_pdf.php?...",
        "pdfProxyUrl": "/api/case/orders/highcourt/pdf?orderLink=...&hcservices_sessid=...&jsession_value=..."
      }
    ]
  },
  "cookies": {
    "HCSERVICES_SESSID": "...",
    "JSESSION": "...",
    "JSESSIONID": "..."
  },
  "raw": "<html>...</html>"
}
```

### Fetch Order PDF

```txt
GET /api/case/orders/highcourt/pdf
```

Query parameters:

- `orderLink`
- `hcservices_sessid`
- `jsession_value`

Example:

```txt
/api/case/orders/highcourt/pdf?orderLink=...encoded...&hcservices_sessid=...&jsession_value=...
```

Recommended frontend usage:

```js
window.open(order.pdfProxyUrl, "_blank");
```

Important notes:

- this endpoint is `GET`, not `POST`
- do not send a JSON body
- do not wrap the URL in quotes
- `pdfProxyUrl` returned by `/api/case/details/highcourt` is already the final relative URL the frontend should open directly

If successful:

- response is the actual PDF stream

If unsuccessful:

```json
{
  "error": "No order PDF uploaded in the HC portal. Please try later",
  "contentType": "text/html; charset=UTF-8",
  "preview": "....",
  "cookies": {},
  "sessionID": "...."
}
```

### Fetch Bench Details

```txt
POST /api/benches/highcourt
```

Request body:

```json
{
  "state_code": "13",
  "appFlag": "web"
}
```

### Fetch Case Types

```txt
POST /api/case/types
```

Request body:

```json
{
  "court_code": "1",
  "state_code": "13",
  "cookies": {
    "HCSERVICES_SESSID": "...",
    "JSESSION": "...",
    "JSESSIONID": "..."
  }
}
```

## Why Order PDF Needed a Proxy

The order PDF URL looked correct, but opening it directly often failed with a message like:

```txt
Orders is not uploaded for case number FAFO/570/2026
```

The real problem was not always the URL itself.

The portal PDF endpoint is session-dependent:

- it expects valid HC portal cookies
- it may depend on the active session generated during search/details flow
- opening the raw HC link directly from frontend can lose that session context

Solution implemented:

- backend now exposes `GET /api/case/orders/highcourt/pdf`
- backend fetches the PDF from HC services using the active `HCSERVICES_SESSID` and `JSESSION`
- backend returns the PDF directly to the browser

This solved the order download/view flow reliably.

## Error Handling

### Shared Portal Errors

Main shared user-facing message:

```txt
No valid case details were returned by the HC portal. Please try later
```

This is used for invalid or empty portal detail responses.

### Important Error Codes

#### `HC_PORTAL_INVALID_CAPTCHA`

Meaning:

- captcha was incorrect for the active HC portal session

Typical frontend message:

```txt
Invalid captcha. Please try again
```

#### `HC_PORTAL_EMPTY_RESPONSE`

Meaning:

- portal returned nothing meaningful
- earlier this also incorrectly triggered for object responses during migration, but that parser bug was fixed

Frontend message:

```txt
No valid case details were returned by the HC portal. Please try later
```

#### `HC_PORTAL_INVALID_RESPONSE`

Meaning:

- portal returned an error-like payload such as:
  - `there is an error`
  - SQL error text
  - malformed portal error output

Frontend message:

```txt
No valid case details were returned by the HC portal. Please try later
```

#### `HC_PORTAL_MISSING_CON`

Meaning:

- portal returned a shape that did not contain the expected `con` results array
- one example encountered was:

```json
{ "Error": "ERROR_VAL" }
```

This was seen during search when the portal rejected the request semantics even though the HTTP status was `200`.

Frontend message:

```txt
No valid case details were returned by the HC portal. Please try later
```

#### `HC_PORTAL_EMPTY_RESULTS`

Meaning:

- portal responded successfully but no usable rows were found in `con`

Frontend message:

```txt
No valid case details were returned by the HC portal. Please try later
```

### Order PDF Non-PDF Response

If the order PDF endpoint returns HTML/text instead of a PDF, backend responds with `502`:

```json
{
  "error": "No order PDF uploaded in the HC portal. Please try later",
  "contentType": "text/html; charset=UTF-8",
  "preview": "...."
}
```

This is useful when the main portal says:

```txt
Orders is not uploaded for case number ...
```

Frontend can show the `error` field directly.

## Known Portal Quirks

- HC portal is strict about session cookies
- captcha must match the same active session
- party-name flow needed `CSpartyName`, not `CSPartyName`
- HC portal still expects `rgyear`, not `rgyearP`
- some responses are JSON strings, some are already parsed objects
- PDF access is session-sensitive
- direct portal links may fail even when the file exists, because cookies are missing

## Important Fixes Made in This Codebase

### 1. Restored `rgyear`

Migration mistakenly moved to `rgyearP`. Final API contract is back to:

- incoming request uses `rgyear`
- outbound HC portal payload also uses `rgyear`

### 2. Restored Working Party Name Search Type

Backend now normalizes:

- `CSPartyName` -> `CSpartyName`

to preserve older working HC behavior.

### 3. Fixed False Empty Response Parsing

During migration, non-string portal responses were incorrectly treated as empty responses. Shared parser now allows already-parsed JSON objects through correctly.

### 4. Removed Circular Axios Responses

Returning full Axios `response` objects in API JSON caused:

```txt
Converting circular structure to JSON
```

That was fixed by not returning raw Axios response objects from service outputs.

### 5. Added Relative `pdfProxyUrl`

Each order in case details now includes:

- `orderLink`: direct HC portal link
- `pdfProxyUrl`: backend relative URL for opening the PDF safely

This avoids hardcoding localhost or production origins in API responses.

## Frontend Recommendations

### Party Name Search

- always use captcha + cookies returned by `/api/captcha/highcourt`
- for party search send `caseStatusSearchType: "CSpartyName"`
- when fetching details, use `case_no2` as the `case_no` if that is what the working HC flow expects

### Case Number Search

- use numeric `case_no`
- do not send the long combined case number in the search request
- use returned `case_type`

### Details and Orders

- use `/api/case/details/highcourt` after selecting a result row
- open `orders[i].pdfProxyUrl` directly in a new tab

### Error Alerts

Frontend can safely show backend `error` field directly for user-facing alerts.

Examples:

- `No valid case details were returned by the HC portal. Please try later`
- `No order PDF uploaded in the HC portal. Please try later`
- `Invalid captcha provided for HC services portal`

## Firebase Configuration

Firebase config is now loaded from environment variables instead of being hardcoded in source.

File:

- [`firebase.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/config/firebase.js)

## Main Source Files

- [`app.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/app.js)
- [`server.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/server.js)
- [`portal.routes.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/modules/portal/portal.routes.js)
- [`party-name.controller.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/modules/searches/party-name/party-name.controller.js)
- [`party-name.service.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/modules/searches/party-name/party-name.service.js)
- [`case-number.controller.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/modules/searches/case-number/case-number.controller.js)
- [`case-number.service.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/modules/searches/case-number/case-number.service.js)
- [`case-details.controller.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/modules/case-details/case-details.controller.js)
- [`case-details.service.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/modules/case-details/case-details.service.js)
- [`portal-response.util.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/shared/utils/portal-response.util.js)
- [`portal.error.js`](/home/krishna/Desktop/Code/Jurident Backend ( Private )/HC Services/src/shared/errors/portal.error.js)

## Summary

This backend now supports:

- stable captcha/session flow
- working party-name search
- working case-number search
- inner case-details extraction
- order PDF opening through backend proxy
- cleaner, frontend-friendly HC portal error messages

The most important practical frontend flow is:

1. captcha
2. search
3. details
4. `pdfProxyUrl`

