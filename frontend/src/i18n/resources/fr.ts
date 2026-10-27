export const fr = {
  common: {
    language: "Langue",
    cancel: "Annuler",
    confirm: "Confirmer",
    validate: "Valider",
    close: "Fermer",
    closeNotification: "Fermer la notification",
    retry: "Réessayer",
    loading: "Chargement…",
    loadErrorTitle: "Impossible de charger les données",
    ai: {
      detected: "Détecté par IA",
      source: "Extrait du document : « {{source}} »",
    },
    amount: {
      confirmAria: "Confirmer le montant détecté par IA",
      confirmedAria: "Montant confirmé",
      confirmedText: "Montant confirmé.",
      hint: "Montant détecté par IA — confirmez-le pour ajouter le frais.",
    },
  },
  api: {
    errors: {
      VALIDATION_FAILED: "Certains champs sont invalides.",
      REQUEST_INVALID: "Requête invalide.",
      INVALID_PARAMETER: "Un paramètre de la requête est invalide.",
      MISSING_OR_INVALID_PARAMETER:
        "Un paramètre de la requête est manquant ou invalide.",
      INVALID_BODY: "Le corps de la requête est absent ou mal formé.",
      FILE_TOO_LARGE:
        "Le fichier dépasse la taille maximale autorisée ({{maxJustificatif}} Mo pour un justificatif, {{maxTemplate}} Mo pour un template).",
      INVALID_FILE:
        "Le fichier n'a pas pu être reçu. Vérifiez son format et sa taille.",
      INTERNAL_ERROR:
        "Une erreur inattendue est survenue. Consultez les journaux du serveur.",
      NETWORK_ERROR:
        "Le serveur est injoignable. Vérifiez que l'application HomeOfficeExpenses est démarrée.",
      HTTP_ERROR: "Erreur {{status}} : la requête a échoué.",
      UNEXPECTED_ERROR: "Une erreur inattendue est survenue.",
    },
  },
  navigation: {
    ariaLabel: "Navigation principale",
    mobileAriaLabel: "Navigation principale mobile",
    sections: {
      tracking: "Suivi",
      settings: "Réglages",
    },
    links: {
      history: "Historique",
      company: "Société",
      lmnp: "LMNP",
      aiAdmin: "Admin IA",
    },
  },
  shell: {
    skipLink: "Aller au contenu",
    tagline: "Quittances & frais d’occupation",
    localDataTitle: "Données locales",
    localDataText:
      "Aucune donnée ne quitte votre machine tant que l’URL du LLM reste locale.",
    footer: "HomeOfficeExpenses · usage personnel",
    draftDialog: {
      title: "Brouillon non généré",
      message:
        "Des informations saisies ne sont pas encore enregistrées. Voulez-vous vraiment quitter cette page ? Le brouillon est conservé pendant la session, mais le document ne sera pas généré.",
      confirm: "Quitter la page",
      cancel: "Rester",
    },
  },
};
