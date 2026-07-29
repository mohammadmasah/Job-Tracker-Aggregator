document.getElementById('saveBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.innerText = "Extraction d'informations...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    statusDiv.innerText = "Aucun onglet actif trouvé.";
    return;
  }
  
  chrome.tabs.sendMessage(tab.id, { action: "extract_job" }, async (jobData) => {

    if (chrome.runtime.lastError || !jobData) {
      statusDiv.innerText = "Veuillez actualiser la page.";
      return;
    }

    statusDiv.innerText = "Envoi à la base de données...";

    try {
      const response = await fetch('http://localhost:8000/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          position: jobData.position,
          company: jobData.company,
          location: jobData.location,
          salary: jobData.salary,
          sector: jobData.sector,
          url: jobData.url,
          description: jobData.description,
          notes: "",
          type: "alternance",
          status: "to_apply",
          remote: false
        })
      });

      if (response.ok) {
        statusDiv.innerText = "Enregistré avec succès sur le tableau de bord !";
      } else {
        statusDiv.innerText = "Erreur de saisie de données !";
      }
    } catch (err) {
      statusDiv.innerText = "Aucune connexion au serveur FastAPI";
    }
  });
});