const form = document.getElementById("maps-form");
const whatInput = document.getElementById("what-to-scrape");
const locationInput = document.getElementById("location");
const runButton = document.getElementById("run-button");
const status = document.getElementById("status");
const output = document.getElementById("json-output");
const downloadButton = document.getElementById("download-json");

let latestJsonString = "";
let latestFileName = "";

function setStatus(text, type = "info") {
  status.textContent = text;
  status.dataset.type = type;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function renderJson(data) {
  latestJsonString = JSON.stringify(data, null, 2);
  output.textContent = latestJsonString;
  output.scrollTop = 0;
}

downloadButton.addEventListener("click", () => {
  if (!latestJsonString) return;

  const blob = new Blob([latestJsonString], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = latestFileName || "maps-results.json";
  anchor.click();
  URL.revokeObjectURL(blobUrl);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const whatToScrape = whatInput.value.trim();
  const location = locationInput.value.trim();
  if (!whatToScrape || !location) return;

  runButton.disabled = true;
  downloadButton.disabled = true;
  setStatus(`Scraping "${whatToScrape}" in "${location}"...`, "loading");
  output.textContent = "";

  try {
    const response = await fetch("/api/maps-scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        what_to_scrape: whatToScrape,
        location,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    renderJson(result.data || {});

    const count = Number(result?.data?.count || 0);
    latestFileName = `${slugify(whatToScrape)}-${slugify(location)}-maps-results.json`;
    downloadButton.disabled = !latestJsonString;
    setStatus(`Done. Collected ${count} places.`, "success");
  } catch (error) {
    setStatus(`Scrape failed: ${error.message}`, "error");
  } finally {
    runButton.disabled = false;
  }
});
