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

// ------------- JOBTEASER ----------------
function extractJobTeaser() {
  let position = 
    document.querySelector('[data-testid="jobad-DetailView__Heading__title"]')?.innerText?.trim() ||
    document.querySelector('h1')?.innerText?.trim();

  let company = 
    document.querySelector('[data-testid="jobad-DetailView__Heading__company_name"]')?.innerText?.trim() ||
    document.getElementById('company-name')?.innerText?.trim() ||
    document.querySelector('a[href*="/companies/"]')?.innerText?.trim();

  if (!company) {
    const titleMatch = document.title.match(/chez\s+([^\-|]+)/i);
    if (titleMatch) company = titleMatch[1].trim();
  }

  let salary = "";
  const salaryEl = document.querySelector('[data-testid="jobad-DetailView__CandidacyDetails__Wage"]');
  if (salaryEl) {
    salary = salaryEl.innerText.trim();
  }

  if (!salary) {
    const allLi = Array.from(document.querySelectorAll('li'));
    const salaryLi = allLi.find(li => 
      li.innerText?.toLowerCase().includes("salary") || 
      li.innerText?.toLowerCase().includes("rémunération")
    );
    if (salaryLi) salary = salaryLi.innerText.replace(/^Salary\s*/i, '').trim();
  }

  let location = 
    document.querySelector('[data-testid="jobad-DetailView__CandidacyDetails__Locations"]')?.innerText?.trim() ||
    document.querySelector('[class*="ContractAndLocations"] p:last-child')?.innerText?.trim() ||
    "";

  let type = 
    document.querySelector('[data-testid="jobad-DetailView__CandidacyDetails__contract"]')?.innerText?.trim()?.toLowerCase() ||
    "";

  if (!type) {
    const fullContent = (document.title + " " + window.location.href).toLowerCase();
    if (fullContent.includes("alternance") || fullContent.includes("apprentissage")) type = "alternance";
    else if (fullContent.includes("cdi")) type = "cdi";
    else if (fullContent.includes("stage") || fullContent.includes("internship")) type = "stage";
  }

  let descriptionText = "";
  const descEl = document.getElementById('description-summary-block') || document.querySelector('[class*="description"]');
  if (descEl && descEl.innerText.trim().length > 50) {
    descriptionText = descEl.innerText.trim();
  }
  
  let sector = "";
  
  const sectorContainer = document.querySelector('[data-testid="jobad-DetailView__Summary__function"]');
  if (sectorContainer) {
    const ddEl = sectorContainer.querySelector('dd');
    if (ddEl) sector = ddEl.innerText.trim();
  }

  if (!sector) {
    const categoryEl = document.querySelector('dd[aria-labelledby="Job Category"]');
    if (categoryEl) sector = categoryEl.innerText.trim();
  }

  if (!sector) {
    const companyInfoEl = document.querySelector('[class*="CompanyInfo-module"]');
    if (companyInfoEl) {
      const parts = companyInfoEl.innerText.split('•');
      if (parts.length > 1) {
        sector = parts[parts.length - 1].trim();
      }
    }
  }
  return { position, company, location, descriptionText, salary, sector, type };
}

// ------------- INDEED ----------------
function extractIndeed() {
  let position = 
    document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.innerText?.trim() ||
    document.querySelector('h1.jobsearch-JobInfoHeader-title')?.innerText?.trim() ||
    document.querySelector('h2.jobsearch-JobInfoHeader-title')?.innerText?.trim();

  if (!position && document.title) {
    const titleParts = document.title.split(' - ');
    if (titleParts.length > 0) position = titleParts[0].trim();
  }

  let company = 
    document.querySelector('[data-testid="inlineHeader-companyName"]')?.innerText?.trim() ||
    document.querySelector('[data-testid="jobsearch-CompanyInfoContainer"] a')?.innerText?.trim() ||
    document.querySelector('[data-testid="jobsearch-CompanyInfoContainer"]')?.innerText?.split('\n')[0]?.trim();

  let location = 
    document.querySelector('[data-testid="inlineHeader-companyLocation"]')?.innerText?.trim() ||
    document.querySelector('[data-testid="jobsearch-CompanyInfoContainer"] div:last-child')?.innerText?.trim() ||
    "";

  let type = document.getElementById('salaryInfoAndJobType')?.innerText?.trim()?.toLowerCase() || "";

  if (type.includes("cdi")) type = "cdi";
  else if (type.includes("cdd")) type = "cdd";
  else if (type.includes("stage") || type.includes("intern")) type = "stage";
  else if (type.includes("alternance") || type.includes("apprentissage")) type = "alternance";
  else if (type.includes("intérim") || type.includes("interim")) type = "intérim";
  else type = "Non spécifié";

  let descriptionText = document.getElementById('jobDescriptionText')?.innerText?.trim() || "";

  let salary = "";
  const salaryContainer = document.getElementById('salaryInfoAndJobType');
  if (salaryContainer) {
    const salarySpan = salaryContainer.querySelector('span');
    if (salarySpan && salarySpan.innerText.includes("€")) {
      salary = salarySpan.innerText.trim();
    }
  }

  let sector = "Non renseigné";

  return { position, company, location, descriptionText, salary, sector, type };
}

// ------------- WELOVEDEVS ----------------
function extractWeLoveDevs() {
  let company = 
    document.querySelector('a[href*="/app/company/"] span')?.innerText?.trim() ||
    document.querySelector('a[href*="/app/company/"]')?.innerText?.trim() ||
    document.querySelector('img[alt*="company"]')?.getAttribute('alt')?.trim() ||
    "";

  let position = document.querySelector('h1')?.innerText?.trim() || "";

  const spans = Array.from(document.querySelectorAll('span'));

  let salary = "";
  const salarySpan = spans.find(span => span.innerText && span.innerText.includes("€"));
  if (salarySpan) {
    salary = salarySpan.innerText.trim();
  }

  let descriptionText = "";
  const descContainer = document.querySelector('h1')?.parentElement?.parentElement;
  if (descContainer) {
    descriptionText = descContainer.innerText?.trim() || "";
  }

  let location = 
    document.querySelector('a[href*="google.com/maps"]')?.innerText?.trim() ||
    "";

  let sector = "IT & Technology";

  let type = "";
  const contractElement = spans.find(s => {
    const txt = (s.innerText || "").toLowerCase();
    return txt.includes("permanent contract") || txt.includes("fixed-term") || txt.includes("cdi") || txt.includes("cdd") || txt.includes("alternance") || txt.includes("stage") || txt.includes("freelance");
  });

  let rawType = contractElement ? contractElement.innerText.toLowerCase() : "";

  if (!rawType) {
    rawType = (position + " " + document.body.innerText).toLowerCase();
  }

  if (rawType.includes("permanent") || rawType.includes("cdi")) type = "cdi";
  else if (rawType.includes("fixed-term") || rawType.includes("cdd")) type = "cdd";
  else if (rawType.includes("stage") || rawType.includes("intern")) type = "stage";
  else if (rawType.includes("alternance") || rawType.includes("apprentissage")) type = "alternance";
  else if (rawType.includes("freelance")) type = "freelance";
  else type = "Non spécifié";

  return { position, company, location, descriptionText, salary, sector, type };
}

// ------------- LA BONNE ALTERNANCE ----------------
function extractLaBonneAlternance() {
  let company = 
    document.querySelector('p[class*="MuiTypography"] span')?.innerText?.trim() ||
    "";

  if (company.includes("recherche")) {
    company = company.split("recherche")[0].trim();
  }

  let position = 
    document.getElementById('detail-header')?.innerText?.trim() ||
    document.querySelector('h3#detail-header')?.innerText?.trim() ||
    document.querySelector('h3')?.innerText?.trim() ||
    "";

  let location = "";
  const cityElem = document.querySelector('p[class*="1cjxt7q"]')?.parentElement;
  if (cityElem) {
    location = cityElem.innerText?.replace(/\n/g, ' ')?.trim() || "";
  }

  let type = "";
  const natureElem = Array.from(document.querySelectorAll('div')).find(el => 
    el.innerText?.includes("Nature du contrat")
  );

  if (natureElem) {
    const rawTypeText = natureElem.innerText.replace(/Nature du contrat\s*:/i, '').trim().toLowerCase();
    
    if (rawTypeText.includes("apprentissage") || rawTypeText.includes("alternance") || rawTypeText.includes("professionnalisation")) {
      type = "alternance";
    } else if (rawTypeText.includes("cdi")) {
      type = "cdi";
    } else if (rawTypeText.includes("cdd")) {
      type = "cdd";
    } else if (rawTypeText.includes("stage")) {
      type = "stage";
    } else {
      type = rawTypeText || "Non spécifié";
    }
  } else {
    type = "Non spécifié";
  }

  let descriptionText = "";
  const descHeading = Array.from(document.querySelectorAll('h4, h3, p, div')).find(el => {
    const txt = el.innerText?.trim().toLowerCase() || "";
    return txt === "description du métier" || txt === "description de l'offre" || txt === "présentation de l'entreprise";
  });

  if (descHeading && descHeading.parentElement) {
    descriptionText = descHeading.parentElement.innerText?.trim() || "";
  }

  if (!descriptionText || descriptionText.length < 50) {
    const mainBox = document.querySelector('div[class*="mui-1nmhkkl"]') || 
      document.getElementById('detail-content-container') || 
      document.querySelector('main');
    if (mainBox) {
      descriptionText = mainBox.innerText?.trim() || "";
    }
  }

  let sector = "Non renseigné";
  const sectorElem = Array.from(document.querySelectorAll('div, p, span')).find(el => {
    const txt = el.innerText || "";
    return txt.includes("Secteur d'activité") && txt.length < 300; // جلوگیری از گرفتن کانتینرهای بزرگ
  });

  if (sectorElem) {
    sector = sectorElem.innerText.replace(/Secteur d'activité\s*:/i, '').trim();
  }
  if (sector.length > 200) {
    sector = sector.substring(0, 200);
  }

  let salary = "";
  const allElements = Array.from(document.querySelectorAll('div, p, span, li'));
  const salaryElem = allElements.find(el => {
    const txt = el.innerText || "";
    return el.children.length === 0 && (txt.includes("€") || /salaire|rémunération/i.test(txt));
  });

  if (salaryElem) {
    salary = salaryElem.innerText.replace(/salaire\s*:?/i, '').trim();
  }

  if (!salary) {
    salary = "Non spécifié";
  }

  return { position, company, location, descriptionText, salary, sector, type };
}

// ------------- LINKEDIN ----------------
function extractLinkedIn() {
  let company = "";
  const titleLink = document.querySelector('a[href*="/jobs/view/"]');
  if (companyLink) {
    company = companyLink.innerText?.trim() || companyLink.getAttribute('aria-label')?.trim() || "";
  }

  if (!company) {
    company = 
      document.querySelector('.job-details-jobs-unified-top-card__company-name')?.innerText?.trim() ||
      document.querySelector('.jobs-unified-top-card__company-name')?.innerText?.trim() ||
      document.querySelector('.job-card-container__company-name')?.innerText?.trim() ||
      "";
  }
  if (company.includes("\n")) {
    company = company.split("\n")[0].trim();
  }

  let position = "";
  const titleLink = document.querySelector('a[href*="/jobs/view/"]');
  if (titleLink) {
    position = titleLink.innerText?.trim() || "";
  }

  if (!position) {
    position = 
      document.querySelector('.job-details-jobs-unified-top-card__job-title')?.innerText?.trim() ||
      document.querySelector('h1')?.innerText?.trim() ||
      document.querySelector('h2')?.innerText?.trim() ||
      "";
  }

  if (position.includes("\n")) {
    position = position.split("\n")[0].trim();
  }

  let location = "";
  const topCard = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container') || document.querySelector('div[class*="primary-description"]');

  if (topCard) {
    location = topCard.innerText?.split('·')[0]?.trim() || "";
  }

  if (!location) {
    const allSpans = Array.from(document.querySelectorAll('span, div'));
    const locSpan = allSpans.find(el => {
      const txt = el.innerText?.trim() || "";
      return el.children.length === 0 && (txt.includes("France") || txt.includes("Paris") || txt.includes("On-site") || txt.includes("Hybrid"));
    });

    if (locSpan) {
      location = locSpan.innerText.split('·')[0].trim();
    }
  }

  if (!location) {
    location = "France";
  }
  let type = "Non spécifié";
  const allTexts = Array.from(document.querySelectorAll('span, div, li')).map(el => el.innerText?.toLowerCase() || "");
  
  if (allTexts.some(txt => txt.includes("apprentissage") || txt.includes("alternance") || txt.includes("apprentice"))) {
    type = "alternance";
  } else if (allTexts.some(txt => txt.includes("cdi") || txt.includes("full-time") || txt.includes("temps plein"))) {
    type = "cdi";
  } else if (allTexts.some(txt => txt.includes("stage") || txt.includes("internship"))) {
    type = "stage";
  } else if (allTexts.some(txt => txt.includes("cdd"))) {
    type = "cdd";
  }

  let descriptionText = "";
  const aboutTheJobElem = document.querySelector('[id*="JobDetails_AboutTheJob"]') || document.querySelector('[componentkey*="JobDetails_AboutTheJob"]');

  if (aboutTheJobElem) {
    descriptionText = aboutTheJobElem.innerText?.trim() || "";
  }

  if (!descriptionText || descriptionText.length < 30) {
    const descContainer = 
      document.getElementById('job-details') || 
      document.querySelector('.jobs-description__content') ||
      document.querySelector('.jobs-box__html-content') ||
      document.querySelector('article');

    if (descContainer) {
      descriptionText = descContainer.innerText?.trim() || "";
    }
  }

  let sector = "Non renseigné";
  const criteriaList = document.querySelectorAll('.jobs-unified-top-card__job-insight');
  if (criteriaList.length > 1) {
    sector = criteriaList[1].innerText?.split('·')[0]?.trim() || "Non renseigné";
  }
  if (sector.length > 200) {
    sector = sector.substring(0, 200);
  }

  let salary = "Non spécifié";
  const salaryElem = Array.from(document.querySelectorAll('span, div')).find(el => {
    const txt = el.innerText || "";
    return el.children.length === 0 && (txt.includes("€") || txt.includes("$") || /salaire/i.test(txt));
  });

  if (salaryElem) {
    salary = salaryElem.innerText.trim();
  }

  return { position, company, location, descriptionText, salary, sector, type };
}
// ---------------- MAIN ---------------
function detectSite() {
  const url = window.location.href;
  if (url.includes("hellowork.com")) return "hellowork";
  if (url.includes("welcometothejungle.com")) return "welcometothejungle";
  if (url.includes("jobteaser.com")) return "jobteaser";
  if (url.includes("indeed.com")) return "indeed";
  if (url.includes("welovedevs.com")) return "welovedevs";
  if (url.includes("labonnealternance")) return "labonnealternance";
  if (url.includes("linkedin.com/jobs")) return "linkedin";
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
    case "jobteaser":
      data = extractJobTeaser();
      break;
    case "indeed":
      data = extractIndeed();
      break;
    case "welovedevs":
      data = extractWeLoveDevs();
      break;
    case "labonnealternance":
      data = extractLaBonneAlternance();
      break;
    case "linkedin":
      data = extractLinkedIn();
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
    type: data.type ? data.type : "Non spécifié",
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