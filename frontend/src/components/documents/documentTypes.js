export const TYPES = [['cv', 'CV'], ['cover_letter', 'Lettre de motivation'], ['invitation', 'Invitation à un entretien'], ['assignment', 'Exercice / test'], ['other', 'Autre document']];
export const documentTypeLabel = (type) => TYPES.find(([id]) => id === type)?.[1] || 'Document';
