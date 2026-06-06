const getRecordId = require("./record_name_to_id.js");
const fs = require("fs");

const input = JSON.parse(fs.readFileSync("output.json", "utf-8"));

async function get() {
  for (permit of input) {
    permit["recordId"] = await getRecordId(permit["Record Number"]);
  }
  fs.writeFileSync("record.id.output.json", JSON.stringify(input, null, 2));
}
get();
