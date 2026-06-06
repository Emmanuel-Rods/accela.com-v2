const cheerio = require("cheerio");
const fs = require("fs");

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

function parsePermits(htmlString) {
  const $ = cheerio.load(htmlString);
  const result = {};

  // 1. Top Level Record Info
  result.recordInfo = {
    recordId: cleanText($("#ctl00_PlaceHolderMain_lblPermitNumber").text()),
    recordType: cleanText($("#ctl00_PlaceHolderMain_lblPermitType").text()),
    recordStatus: cleanText($("#ctl00_PlaceHolderMain_lblRecordStatus").text()),
    expirationDate: cleanText(
      $("#ctl00_PlaceHolderMain_lblExpirtionDate").text(),
    ),
  };

  // 2. Work Location
  result.workLocation = parseBrBlock($, "#tbl_worklocation .NotBreakWord");

  // 3. Record Details (Main blocks)
  result.applicant = {
    name: cleanText(
      $(".contactinfo_firstname").first().text() +
        " " +
        $(".contactinfo_lastname").first().text(),
    ),
    businessName: cleanText($(".contactinfo_businessname").first().text()),
    address: cleanText($(".contactinfo_addressline1").first().text()),
    region: cleanText(
      $(".contactinfo_region")
        .map((i, el) => $(el).text())
        .get()
        .join(" "),
    ),
    country: cleanText($(".contactinfo_country").first().text()),
    phone: cleanText(
      $(".contactinfo_phone1").text().replace("Home Phone:", ""),
    ),
    email: cleanText(
      $(".contactinfo_email").first().text().replace("E-mail:", ""),
    ),
  };

  // Licensed Professionals (Grabs visible and hidden/additional ones)
  result.licensedProfessionals = [];
  $("#tbl_licensedps tr").each((i, el) => {
    let text = parseBrBlock($, $(el).find("td").eq(1));
    // Filter out empty rows and "View Additional..." links
    if (text && !text.includes("View Additional")) {
      result.licensedProfessionals.push(text);
    }
  });

  // Project Description & Owner
  // These are found in the large permit details table by targeting their adjacent header span IDs
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
    if (text) result.relatedContacts.push(text);
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

// console.log(JSON.stringify(parsedData, null, 2));

module.exports = parsePermits;
