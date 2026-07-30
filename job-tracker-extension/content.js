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

  const targetEl = document.querySelector('[data-truncate-text-target="content"]');
  if (targetEl && targetEl.innerText.trim().length > 50) {
    descriptionText = targetEl.innerText.trim();
  }

  if (!descriptionText) {
    const typoEl = document.querySelector('.typo-long-m');
    if (typoEl && typoEl.innerText.trim().length > 50) {
      descriptionText = typoEl.innerText.trim();
    }
  }

  if (!descriptionText) {
    const descSelectors = [
      '[class*="jobDescription"]',
      '[class*="job-description"]',
      'section[class*="content"]'
    ];
    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 100) {
        descriptionText = el.innerText.trim();
        break;
      }
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

  // ------------- WELCOME TO THE JUNGLE ----------------
function extractWelcomeToTheJungle() {
  let position = 
    document.querySelector('h2.wui-text')?.innerText?.trim() ||
    document.querySelector('[data-testid="job-metadata-title"]')?.innerText?.trim() ||
    document.querySelector('h1')?.innerText?.trim() ||
    document.querySelector('h2')?.innerText?.trim();

  if (!position && document.title) {
    const titleParts = document.title.split(' - ');
    if (titleParts.length > 0) {
      position = titleParts[0].trim();
    }
  }

  let company = 
    document.querySelector('a[href*="/companies/"] span')?.innerText?.trim() ||
    document.querySelector('a[href*="/companies/"]')?.innerText?.trim() ||
    document.querySelector('[data-testid="job-metadata-company-name"]')?.innerText?.trim();

  if (!company) {
    const urlMatch = window.location.href.match(/\/companies\/([^\/]+)/);
    if (urlMatch) {
      company = urlMatch[1].replace(/-/g, ' ').toUpperCase();
    }
  }

  let salary = "";

  const metadataDivs = Array.from(document.querySelectorAll('div[variant="default"], [data-testid="job-metadata-salary"]'));
  const salaryDiv = metadataDivs.find(div => 
    div.innerText?.includes("Salaire") || 
    div.innerText?.includes("€") || 
    div.innerText?.includes("k€")
  );

  if (salaryDiv) {
    salary = salaryDiv.innerText.replace(/^Salaire\s*:\s*/i, '').trim();
  }
  if (!salary) {
    const allSpansAndDivs = Array.from(document.querySelectorAll('section div, section span'));
    const found = allSpansAndDivs.find(el => el.children.length === 0 && el.innerText?.startsWith("Salaire :"));
    if (found) {
      salary = found.innerText.replace(/^Salaire\s*:\s*/i, '').trim();
    }
  }

  let location = "";

  const locationSvg = document.querySelector('svg[alt="Location"]');
  if (locationSvg) {
    const parentDiv = locationSvg.closest('div[variant="default"]');
    if (parentDiv) location = parentDiv.innerText.trim();
  }

  if (!location) {
    const dataTestEl = document.querySelector('[data-testid="job-metadata-location"]');
    if (dataTestEl) location = dataTestEl.innerText.trim();
  }

  if (!location) {
    const urlParts = window.location.href.split('_');
    if (urlParts.length > 1) {
      location = urlParts[urlParts.length - 1].replace(/-/g, ' ').toUpperCase();
    }
  }

  let descriptionText = "";

  const descEl = document.querySelector('[data-testid="job-section-description"]');
  if (descEl && descEl.innerText.trim().length > 50) {
    descriptionText = descEl.innerText.trim();
  }
  if (!descriptionText) {
    const positionSection = document.getElementById('the-position-section');
    if (positionSection && positionSection.innerText.trim().length > 50) {
      descriptionText = positionSection.innerText.trim();
    }
  }
  if (!descriptionText) {
    const descSelectors = [
      'section[data-testid*="job"]',
      'div[class*="description"]',
      'div[id*="description"]'
    ];
    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 100) {
        descriptionText = el.innerText.trim();
        break;
      }
    }
  }

  let type = "";

  const metadataDivsForType = Array.from(document.querySelectorAll('div[variant="default"]'));
  if (metadataDivsForType.length > 0) {
    type = metadataDivsForType[0].innerText.trim().toLowerCase();
  }

  if (!type) {
    const fullContent = (document.title + " " + window.location.href).toLowerCase();
    if (fullContent.includes("alternance")) type = "alternance";
    else if (fullContent.includes("cdi")) type = "cdi";
    else if (fullContent.includes("cdd")) type = "cdd";
    else if (fullContent.includes("stage")) type = "stage";
    else if (fullContent.includes("freelance")) type = "freelance";
  }

  let sector = "";
  const sectorEl = document.querySelector('[data-testid="job-company-tag"]');
  if (sectorEl) {
    sector = sectorEl.innerText.trim();
  }

  if (!sector) {
    const tagSvg = document.querySelector('svg[alt="Tag"]');
    if (tagSvg) {
      const parentDiv = tagSvg.closest('div');
      if (parentDiv) sector = parentDiv.innerText.trim();
    }
  }
  return { position, company, location, descriptionText, salary, sector, type }
}
// ---------------- MAIN ---------------
function detectSite() {
  const url = window.location.href;
  if (url.includes("hellowork.com")) return "hellowork";
  if (url.includes("welcometothejungle.com")) return "welcometothejungle";
  return "unknown";
}

function extractJob() {
  const site = detectSite();
  let data;

  switch(site) {
    case "hellowork": 
      data = extractHelloWork(); 
      break;
    case "welcometothejungle":
      data = extractWelcomeToTheJungle();
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
    notes: "",
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