const buildBasicPayload = require("./payload.js");
const inspectionPayloadBuilder = require("./inspection_payload.js");
const postToServer = require("./post.js");
const parseInspectionsData = require("./inspection_parser.js");
const nextInspectionPayloadBuilder = require("./next_inspection_payload.js");
const fs = require("fs");

const cookie_str =
  "ACA_USER_PREFERRED_CULTURE=en-US; ApplicationGatewayAffinityCORS=f1d08f118230de263157e2af7da41687; ApplicationGatewayAffinity=f1d08f118230de263157e2af7da41687; ACA_SS_STORE=4ffwvf42jsbxxjc13whkiinb; ACA_CS_KEY=a25c88bba07243daaba4588616b8d7c7; _cfuvid=qrGiJW3zVTzByWYJRY3BgZDloCrZiRmWPh1gqopTRgA-1780736108.7986572-1.0.1.1-Dzq5BWCB0Er5ki7CQIs9bJUCeYR8tFoK24sGlbRVWcc; .ASPXANONYMOUS=pg1uSW2LsXX4aSuQuKd3iqfSQn8v8SS3lsXauIrlyBLqVg4TrmvBUK0N2idP8n84HGmkWQ1x2T1LMSR3siSw_umtm3-bHGcDUy5jvWgzeOAeKytjwliIVpM33N2LGGjvqg0x8huris1O-NRm7dw0NkbQyHc1; LASTEST_REQUEST_TIME=1780742455917; _dd_s=rum=2&id=daa5be46-b8e5-4953-882c-b148d062eb15&created=1780736101158&expire=1780739773201";

const MAX_PAGINATION = 10;

async function getInspection(url, html, cookies) {
  const inspectionDataArray = [];

  const basePayload = buildBasicPayload(html);
  const payload = inspectionPayloadBuilder(basePayload);
  const inspectionHTML = await postToServer(url, payload, cookies);
  fs.writeFileSync("inspecton.html", inspectionHTML);
  let inspectionData = parseInspectionsData(inspectionHTML);
  const summary = inspectionData.summary;
  inspectionDataArray.push(...inspectionData.inspections);
  let page = 0;
  if (inspectionData.hasNextPage) {
    while (inspectionData.hasNextPage && page < MAX_PAGINATION) {
      let nextpayload = nextInspectionPayloadBuilder(
        inspectionData.nextPayload,
      );
      console.log(nextpayload);
      const html = await postToServer(url, nextpayload, cookies);
      fs.writeFileSync("next.html", html);
      inspectionData = parseInspectionsData(html);
      inspectionDataArray.push(...inspectionData.inspections);
      page++;
      console.log("ON page", page);
    }
  }

  //remove later
  fs.writeFileSync(
    "test.inspection.data.array.json",
    JSON.stringify(inspectionDataArray, null, 2),
  );
  // return inspectionDataArray;
  return {
    summary: summary,
    inspections: inspectionDataArray,
  };
}

module.exports = getInspection;
