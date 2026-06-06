const getHTML = require("../html.js");
const buildBasicPayload = require("../payload.js");
const recordIDPayloadBuilder = require("../record_id_payload.js");
const encodeToFormData = require("../formEncoder.js");
const postToServer = require("../post.js");
const parseAccelaRedirect = require("../redirect_parser.js");

async function getRecordId(recordNumber) {
  const html = require("fs").readFileSync("./html_diff/gethtml.html", "utf-8");
  //   require("fs").writeFileSync("gethtml.html", html.html);
  const BasePayload = buildBasicPayload(html); // builds the skeleton
  const payload = recordIDPayloadBuilder(BasePayload, recordNumber);
  require("fs").writeFileSync(
    "html.payload.json",
    JSON.stringify(payload, null, 2),
  );
}
getRecordId("RES-NEW-26-003082");
