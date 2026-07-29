// ------------- HELLOWORK ----------------
function extractHelloWork() {
  let position = document.querySelector('h1')?.innerText?.trim();
    
  let company = 
    document.querySelector('a[href*="/fr-fr/entreprises/"]')?.innerText?.trim() ||
    document.querySelector('a[href*="/entreprises/"]')?.innerText?.trim() ||
    document.querySelector('a[title*="recrutement"]')?.innerText?.trim();

  if (!company) {
    const titleMatch = document.title.match(/Recrutement par ([^|]+)/i);
    if (titleMatch) company = titleMatch[1].trim();
  }

  let salary = 
    document.querySelector('span.truncate')?.innerText?.trim() ||
    document.querySelector('[data-cy="salary-tag-button"] span')?.innerText?.trim() ||
    document.querySelector('button[data-analytics-values-param*="salary"] span.truncate')?.innerText?.trim();

  let location = "";
  const allLis = Array.from(document.querySelectorAll('li'));
  const locationLi = allLis.find(li => 
    li.innerText?.match(/\d{2}$/) ||
    li.innerText?.includes(" - ")
  );

  if (locationLi) location = locationLi.innerText.trim();

  if (!location) {
    const titleMatch = document.title.match(/\((\d{2})\)/);
    const cityMatch = document.title.match(/([A-Za-zÀ-ÿ\-]+)\s*\(\d{2}\)/);
    if (cityMatch && titleMatch) {
      location = `${cityMatch[1]} - ${titleMatch[1]}`;
    }
  }

  let descriptionText = "";
  const descSelectors = [
    '[class*="jobDescription"]',
    '[class*="job-description"]',
    'section[class*="content"]',
  ];
  
  for (const sel of descSelectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 200) {
      descriptionText = el.innerText.trim();
      break;
    }
  }

  if (!descriptionText) {
    const allSections = Array.from(document.querySelectorAll('section, div, article'));
    const missionSection = allSections.find(el =>
      el.innerText?.includes("Les missions du poste") &&
      el.innerText?.length > 300
    );
    if (missionSection) {
      descriptionText = missionSection.innerText.trim();
    }
  }

  let sector = "";
  const sectorLis = Array.from(document.querySelectorAll('li.block.tag-secondary-s'));
  if (sectorLis.length > 0) {
    const sectorLi = sectorLis.find(li => 
      li.innerText?.includes("Secteur") || 
      li.innerText?.includes("•")
    );
    if (sectorLi) sector = sectorLi.innerText.trim();
  }

  let type = "";
  const typeLis = Array.from(document.querySelectorAll('li.typo-long-m-bold'));
  if (typeLis.length > 0) {
    type = typeLis[0].innerText.trim().toLowerCase();
  }

  if (!type) {
    if (window.location.href.includes("alternance") || document.title.toLowerCase().includes("alternance")) {
      type = "alternance";
    }
  }

  return { position, company, location, descriptionText, salary, sector, type };
}

// ---------------- MAIN ---------------
function detectSite() {
  const url = window.location.href;
  if (url.includes("hellowork.com")) return "hellowork";
  return "unknown";
}

function extractJob() {
  const site = detectSite();
  let data;

  switch(site) {
    case "hellowork": 
      data = extractHelloWork(); 
      break;
    default:          
      data = {};
  }

  let descriptionText = (data.descriptionText || "")
    .replace(/\n\s*\n/g, '\n\n')
    .substring(0, 3000) || "Description non disponible.";

  return {
    position: data.position || "Développeur",
    company: data.company || "Entreprise inconnue",
    location: data.location || "France",
    salary: data.salary || "",
    sector: data.sector || "",
    type: data.type || "alternance",
    description: descriptionText,
    notes: descriptionText,
    url: window.location.href
  };
}

// -------------- LISTENER ---------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_job") {
    setTimeout(() => {
      const jobData = extractJob();
      sendResponse(jobData);
    }, 1500);
  }
  return true;
});