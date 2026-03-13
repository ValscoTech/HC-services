const axios = require("axios");
const {
  getDocs,
  collection,
  doc,
  setDoc,
  Timestamp,
  deleteDoc,
} = require("firebase/firestore");
const { db } = require("../../config/firebase");
const { agent } = require("../../config/http");
const {
  convertDateFormat,
  convertHyphenToSlash,
} = require("../../shared/utils/date.util");

const normalizeCase = (existingCase, apiData) => {
  const nextHearingDate = convertDateFormat(
    apiData?.data?.caseStatus?.["Next Hearing Date"] || "",
  );

  const hearingHistory = apiData?.data?.hearingHistory;
  const hearingHistoryLength = Array.isArray(hearingHistory)
    ? hearingHistory.length
    : 0;

  let previousHearingDate = "";
  if (hearingHistoryLength > 0 && hearingHistory[hearingHistoryLength - 1]) {
    previousHearingDate = convertHyphenToSlash(
      hearingHistory[hearingHistoryLength - 1].hearingDate || "",
    );
  }

  const caseDataToExport = {
    nextHearingDate: nextHearingDate || existingCase.nextHearingDate || "",
    previousHearingDate:
      previousHearingDate || existingCase.previousHearingDate || "",
    caseHistory: hearingHistory || existingCase.caseHistory || [],
    orders: apiData?.data?.orders || existingCase.orders || [],
    refreshedAt: Timestamp.now(),
  };

  return caseDataToExport;
};

async function refreshExports() {
  const collectionsToCheck = [
    "pending",
    "disposed",
    "decided",
    "failedExports",
  ];
  const allCases = [];

  for (const col of collectionsToCheck) {
    const snapshot = await getDocs(collection(db, col));
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data?.payload?.caseexportedfrom === "HighCourt") {
        allCases.push({ ...data, id: docSnap.id, collection: col });
      }
    });
  }

  if (allCases.length === 0) {
    return { message: "No High Court cases found to refresh." };
  }

  let cookies = null,
    cookieFetchedAt = 0,
    MAX_RETRIES = 2;

  const COOKIE_TTL = 10 * 60 * 1000;

  const getCookies = async () => {
    if (!cookies || Date.now() - cookieFetchedAt > COOKIE_TTL) {
      const cookieRes = await axios.post(
        "https://jhc.jurident.com/api/captcha/highcourt",
      );
      cookies = cookieRes.data.cookies;
      cookieFetchedAt = Date.now();
    }
    return cookies;
  };

  const callCaseAPI = async (payload) => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const currentCookies = await getCookies();
        const hcservices_sessid = currentCookies.HCSERVICES_SESSID;
        const jsession_value =
          currentCookies.JSESSION || currentCookies.JSESSIONID;

        const response = await axios.post(
          "https://jhc.jurident.com/api/case/details/highcourt",
          {
            ...payload,
            hcservices_sessid,
            jsession_value,
          },
          { httpsAgent: agent, timeout: 15000 },
        );

        return response.data;
      } catch (err) {
        const isCookieError =
          err.response?.status === 401 ||
          /session|expired/i.test(err.response?.data?.error || err.message);

        if (isCookieError && attempt < MAX_RETRIES) {
          cookies = null;
          continue;
        }
        throw err;
      }
    }
  };

  const processCases = async (cases) => {
    const BATCH_SIZE = 2;

    for (let i = 0; i < cases.length; i += BATCH_SIZE) {
      const batch = cases.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (c) => {
          try {
            const { detailsPayload } = c.payload || {};
            if (!detailsPayload) {
              return;
            }

            const latestCase = await callCaseAPI({
              court_code: detailsPayload.court_code,
              state_code: detailsPayload.state_code,
              court_complex_code: detailsPayload.court_complex_code,
              case_no: detailsPayload.case_no,
              cino: detailsPayload.cino,
              appFlag: detailsPayload.appFlag || "",
            });

            if (
              !latestCase ||
              Object.keys(latestCase).length === 0 ||
              latestCase.error
            ) {
              return;
            }

            const normalizedCase = normalizeCase(c, latestCase);

            const caseRef = doc(db, c.collection, c.id);
            await setDoc(caseRef, normalizedCase, { merge: true });

            const failedRef = doc(db, "failedExports", c.id);
            await deleteDoc(failedRef).catch((err) => {
              console.error(`Failed to delete from failedExports:`, err);
            });
          } catch (err) {
            const failedPayload = {
              payload: { ...c, failedAt: Timestamp.now() },
            };
            await setDoc(doc(db, "failedExports", c.id), failedPayload, {
              merge: true,
            });
          }
        }),
      );

      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const MAX_CYCLES = 5;
  let cycle = 0;
  let delay = 2000;

  while (cycle < MAX_CYCLES) {
    const failedSnap = await getDocs(collection(db, "failedExports"));
    const failedCases = failedSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      collection: "failedExports",
    }));

    if (cycle === 0) await processCases(allCases);
    else if (failedCases.length > 0) await processCases(failedCases);

    if (failedCases.length === 0) {
      break;
    }

    cycle++;
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }

  return { message: "Cases refreshed successfully" };
}

module.exports = {
  refreshExports,
};
