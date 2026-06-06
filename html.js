const processCookies = require("./cookie_parser.js");

/**
 * Fetches the HTML content from the specified URL.
 * @returns {Promise<string>} The HTML content of the page.
 */
async function getHTML() {
  const url =
    "https://aca-prod.accela.com/MECKLENBURG/Cap/CapHome.aspx?module=Building&TabName=Building&TabList=Home";
  try {
    const response = await fetch(url, {
      method: "GET",
      // Some servers block requests without a standard User-Agent
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const cookies = processCookies(response);
    require("fs").writeFileSync("gethtml.html", html);
    return { html, cookies };
  } catch (error) {
    console.error("Error fetching the HTML:", error.message);
    throw error;
  }
}

module.exports = getHTML;

getHTML();
