const cheerio = require("cheerio");

// Helper function to clean up messy HTML text (removes extra spaces, newlines, etc.)
const cleanText = (text) => {
  if (!text) return "";
  return text
    .replace(/[\r\n\t]+/g, " ") // Replace newlines and tabs with spaces
    .replace(/\s{2,}/g, " ") // Replace multiple spaces with a single space
    .replace(/\*$/g, "") // Remove trailing asterisks
    .trim();
};

// Helper function to parse blocks containing <br> tags into clean multiline arrays/strings
const parseBrBlock = ($, element) => {
  let html = $(element).html();
  if (!html) return "";
  return cleanText(
    $("<div>")
      .html(html.replace(/<br\s*\/?>/gi, " | "))
      .text(),
  );
};

function parsePermits(htmlString, recordId) {
  const $ = cheerio.load(htmlString);
  const result = {};

  // Helper to extract phones specifically formatted with .ACA_PhoneNumberLTR
  // Finds the number and looks at the adjacent cell for the type (e.g. "Work Phone")
  const extractPhones = (context) => {
    const phones = {};
    $(context)
      .find(".ACA_PhoneNumberLTR")
      .each((i, el) => {
        let type = cleanText(
          $(el).closest("tr").find("td").first().text(),
        ).replace(":", "");
        let num = cleanText($(el).text());
        if (type && num) {
          phones[type] = num;
        }
      });
    return phones;
  };

  // 1. Top Level Record Info
  result.recordInfo = {
    "Record Number": cleanText(
      $("#ctl00_PlaceHolderMain_lblPermitNumber").text(),
    ),
    recordId: recordId,
    recordType: cleanText($("#ctl00_PlaceHolderMain_lblPermitType").text()),
    recordStatus: cleanText($("#ctl00_PlaceHolderMain_lblRecordStatus").text()),
    expirationDate: cleanText(
      $("#ctl00_PlaceHolderMain_lblExpirtionDate").text(),
    ),
  };

  // 2. Work Location
  result.workLocation = parseBrBlock($, "#tbl_worklocation .NotBreakWord");

  // 3. Record Details (Main blocks)
  const applicantTd = $('span[id*="label_applicant"]').closest("td");
  result.applicant = {
    name: cleanText(
      applicantTd.find(".contactinfo_firstname").first().text() +
        " " +
        applicantTd.find(".contactinfo_lastname").first().text(),
    ),
    businessName: cleanText(
      //   applicantTd.find(".contactinfo_businessname").first().text(),
      $(".contactinfo_businessname").first().text(),
    ),
    address: cleanText(
      applicantTd.find(".contactinfo_addressline1").first().text(),
    ),
    // Using Set to prevent duplication if elements overlap
    region: [
      ...new Set(
        applicantTd
          .find(".contactinfo_region")
          .map((i, el) => cleanText($(el).text()))
          .get(),
      ),
    ].join(" "),
    country: cleanText(applicantTd.find(".contactinfo_country").first().text()),
    email: cleanText(
      applicantTd
        .find(".contactinfo_email")
        .first()
        .text()
        .replace("E-mail:", ""),
    ),
    // Attach dynamically parsed phones
    phones: extractPhones(applicantTd),
  };

  // Licensed Professionals
  result.licensedProfessionals = [];
  $("#tbl_licensedps")
    .find("tr")
    .each((i, el) => {
      // Prevent grabbing nested TRs (which caused the standalone phone number strings in your old array)
      if ($(el).closest("table").attr("id") !== "tbl_licensedps") return;

      let text = parseBrBlock($, $(el).find("> td").eq(1));
      if (text && !text.includes("View Additional")) {
        // Changed to objects to keep plaintext while exposing phones cleanly
        result.licensedProfessionals.push({
          rawText: text,
          phones: extractPhones(el),
        });
      }
    });

  // Project Description & Owner
  result.projectDescription = parseBrBlock(
    $,
    $('span[id*="label_project"]').closest("td").find(".table_child td").eq(1),
  );
  result.owner = parseBrBlock(
    $,
    $('span[id*="label_owner"]').closest("td").find(".table_child td").last(),
  );

  // 4. More Details -> Related Contacts
  result.relatedContacts = [];
  $("#trRCList .MoreDetail_ItemCol").each((i, el) => {
    let text = parseBrBlock($, el);
    if (text) {
      // Changed to objects to keep plaintext while exposing phones cleanly
      result.relatedContacts.push({
        type: cleanText($(el).find("h2").text()), // Grabs "Property Owner information", etc.
        rawText: text,
        phones: extractPhones(el),
      });
    }
  });

  // 5. Application Information (ASI - Key/Value pairs grouped by category)
  result.applicationInformation = {};
  let currentCategory = "General";

  $("#trASIList .MoreDetail_BlockContent > div").each((i, el) => {
    const $el = $(el);
    // Category headers
    if ($el.hasClass("MoreDetail_ItemTitle")) {
      currentCategory = cleanText($el.text());
      result.applicationInformation[currentCategory] = {};
    }
    // 2-Column layout items
    else if ($el.hasClass("ACA_TabRow")) {
      $el.find(".ASIReview2Columns").each((j, col) => {
        let key = cleanText($(col).find(".ACA_SmLabelBolder").text()).replace(
          /:$/,
          "",
        );
        let val = cleanText($(col).find(".ACA_SmLabel").text());
        if (key) result.applicationInformation[currentCategory][key] = val;
      });
    }
    // Vertical layout items
    else if ($el.hasClass("MoreDetail_ItemCol1")) {
      let key = cleanText($el.text()).replace(/:$/, "");
      let val = cleanText($el.next(".MoreDetail_ItemCol2").text());
      if (key) result.applicationInformation[currentCategory][key] = val;
    }
  });

  // 6. Application Information Tables (ASIT - Grids/Tables)
  result.applicationInformationTables = {};
  $("#trASITList table").each((i, tbl) => {
    let title = cleanText($(tbl).find(".ACA_Title_Text").text());
    if (!title) return; // Skip layout tables

    result.applicationInformationTables[title] = [];

    $(tbl)
      .find(".MoreDetail_Item")
      .each((j, item) => {
        let rowObj = {};
        let keys = $(item).find(".MoreDetail_ItemCol1");
        let vals = $(item).find(".MoreDetail_ItemCol2");

        keys.each((k, keyEl) => {
          let key = cleanText($(keyEl).text()).replace(/:$/, "");
          let val = cleanText($(vals[k]).text());
          if (key) rowObj[key] = val;
        });
        if (Object.keys(rowObj).length > 0)
          result.applicationInformationTables[title].push(rowObj);
      });
  });

  // 7. Parcel Information
  result.parcelInformation = {};
  $("#trParcelList .MoreDetail_ItemCol2").each((i, el) => {
    let text = cleanText($(el).text());
    if (text.includes(":")) {
      let parts = text.split(":");
      result.parcelInformation[parts[0].trim()] = parts
        .slice(1)
        .join(":")
        .trim();
    }
  });

  return result;
}

module.exports = parsePermits;
