const saveButton = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');
const loginLink = document.getElementById('loginLink');

saveButton.addEventListener('click', async () => {
  if (saveButton.disabled) return;
  saveButton.disabled = true;
  loginLink.hidden = true;
  statusDiv.textContent = "Extraction d'informations...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      statusDiv.textContent = 'Aucun onglet actif trouvé.';
      return;
    }
    let jobData;
    try {
      jobData = await chrome.tabs.sendMessage(tab.id, { action: 'extract_job' });
    } catch {
      statusDiv.textContent = "Actualise la page de l'offre, puis réessaie sur un site pris en charge.";
      return;
    }
    if (!jobData) {
      statusDiv.textContent = 'Aucune offre détectée sur cette page.';
      return;
    }

    statusDiv.textContent = 'Envoi à la base de données...';
    const response = await fetch('http://localhost:8000/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        position: jobData.position,
        company: jobData.company,
        location: jobData.location,
        salary: jobData.salary,
        sector: jobData.sector,
        url: jobData.url,
        description: jobData.description || '',
        notes: jobData.description || '',
        type: jobData.type || 'Non spécifié',
        status: 'to_apply',
        remote: false
      })
    });
    if (response.ok) {
      statusDiv.textContent = 'Enregistré avec succès sur le tableau de bord !';
    } else if (response.status === 401) {
      statusDiv.textContent = "Connecte-toi à Job Tracker sur localhost:3000 dans ce profil Chrome, puis réessaie. Si tu es déjà connecté, recharge l'extension et autorise son accès à localhost.";
      loginLink.hidden = false;
    } else if (response.status === 422) {
      statusDiv.textContent = 'Les informations de cette offre sont incomplètes ou invalides. Tu peux la saisir depuis le tableau de bord.';
    } else {
      statusDiv.textContent = `Enregistrement impossible (erreur ${response.status}). Réessaie dans un instant.`;
    }
  } catch (error) {
    statusDiv.textContent = error.name === 'TimeoutError'
      ? 'Le serveur met trop de temps à répondre. Vérifie le tableau de bord avant de réessayer pour éviter un doublon.'
      : "Impossible de joindre Job Tracker. Vérifie que le serveur est démarré sur localhost:8000 et que l'extension a accès à localhost.";
  } finally {
    saveButton.disabled = false;
  }
});
