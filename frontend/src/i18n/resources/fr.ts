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
      METHOD_NOT_ALLOWED:
        "Cette action n'est pas autorisée pour cette adresse.",
      UNSUPPORTED_MEDIA_TYPE:
        "Le format de la requête n'est pas pris en charge.",
      NOT_ACCEPTABLE: "Le format de réponse demandé n'est pas disponible.",
      INTERNAL_ERROR:
        "Une erreur inattendue est survenue. Consultez les journaux du serveur.",
      NETWORK_ERROR:
        "Le serveur est injoignable. Vérifiez que l'application HomeOfficeExpenses est démarrée.",
      HTTP_ERROR: "Erreur {{status}} : la requête a échoué.",
      UNEXPECTED_ERROR: "Une erreur inattendue est survenue.",
      ADDRESS_REQUIRED: "L'adresse du bien est obligatoire.",
      AMOUNT_REQUIRED: "Le montant est obligatoire.",
      AMOUNT_INVALID: "Le montant est invalide.",
      AMOUNT_MUST_BE_STRICTLY_POSITIVE:
        "Le montant doit être strictement positif.",
      AMOUNT_MUST_BE_POSITIVE_OR_ZERO: "Le montant doit être positif ou nul.",
      AMOUNT_NEGATIVE: "Le montant TTC ne peut pas être négatif.",
      AMOUNT_PRO_RATA_REQUIRED:
        "Le montant du mois et le prorata sont obligatoires.",
      PRO_RATA_REQUIRED: "Le prorata est obligatoire.",
      PRO_RATA_INVALID: "Le prorata n'est pas un pourcentage valide.",
      PRO_RATA_TOO_MANY_DECIMALS:
        "Le prorata accepte au maximum deux décimales.",
      PRO_RATA_OUT_OF_RANGE: "Le prorata doit être compris entre 0 et 100 %.",
      PRO_RATA_BUSINESS_AREA_OUT_OF_RANGE:
        "La surface professionnelle doit être comprise entre 0 et la surface totale.",
      DATE_INVALID: "La date est invalide.",
      MONTH_REQUIRED: "Le mois est obligatoire (format AAAA-MM).",
      MONTH_INVALID: "Le mois doit être au format AAAA-MM.",
      VAT_NET_AMOUNT_REQUIRED: "Le montant HT est obligatoire.",
      VAT_NET_AMOUNT_NEGATIVE: "Le montant HT ne peut pas être négatif.",
      VAT_RATE_REQUIRED: "Le taux de TVA est obligatoire.",
      VAT_RATE_OUT_OF_RANGE:
        "Le taux de TVA doit être compris entre 0 et 100 %.",
      COMPANY_REQUIRED: "Sélectionnez une société.",
      COMPANY_NOT_FOUND: "Société introuvable.",
      COMPANY_NAME_REQUIRED: "Le nom de la société est obligatoire.",
      COMPANY_SIREN_DUPLICATE: "Une société avec ce SIREN existe déjà.",
      COMPANY_IN_USE:
        "Cette société est utilisée par des données et ne peut pas être supprimée.",
      COMPANY_ACTIVE_LEASE_TENANT:
        "Cette société est locataire d'un bail actif et ne peut pas être supprimée.",
      LEASE_NOT_FOUND: "Bail introuvable.",
      LEASE_ALREADY_LINKED: "Ce bail est déjà lié à une autre société.",
      LEASE_COMPANY_LEASE_LOCKED:
        "Ce bail est lié à une société et ne peut pas être modifié.",
      LEASE_PARTIES_REQUIRED: "Sélectionnez un bailleur et un locataire.",
      LEASE_SINGLE_TENANT_REQUIRED: "Sélectionnez un seul locataire.",
      LEASE_ACTIVE_NOT_FOUND: "Aucun bail actif n'est configuré.",
      LEASE_NOT_IN_COMPANY: "Ce bail n'appartient pas à la société.",
      LEASE_LANDLORD_REQUIRED: "Sélectionnez un bailleur.",
      LEASE_COMPANY_TENANT_INVALID:
        "La société locataire ne peut pas être la société du bail.",
      LEASE_TENANT_COMPANY_REQUIRED: "Sélectionnez la société locataire.",
      LEASE_ALREADY_EXISTS:
        "Un bail actif existe déjà pour ce bailleur et ce locataire.",
      LEASE_TENANT_REQUIRED: "Sélectionnez un locataire.",
      LEASE_PARTIES_IDENTICAL:
        "Le bailleur et le locataire ne peuvent pas être identiques.",
      LEASE_COMPANY_ALREADY_LINKED:
        "Cette société est déjà liée à un bail actif.",
      LEASE_SURFACES_REQUIRED:
        "Les surfaces sont obligatoires pour un bail société.",
      LEASE_EMPLOYEE_PARTY: "Un salarié ne peut pas être partie à un bail.",
      PERSON_REQUIRED: "Sélectionnez une personne.",
      PERSON_NOT_FOUND: "Personne introuvable.",
      PERSON_HAS_SIGNATURES:
        "Cette personne porte des signatures et ne peut pas être supprimée.",
      PERSON_IN_USE:
        "Cette personne est utilisée par des données et ne peut pas être supprimée.",
      PERSON_NAME_REQUIRED: "Le nom de la personne est obligatoire.",
      EMPLOYEE_HAS_SIGNATURES:
        "Ce salarié porte des signatures et ne peut pas être supprimé.",
      EMPLOYEE_NOT_FOUND: "Salarié introuvable.",
      EMPLOYEE_FIRST_NAME_REQUIRED: "Le prénom du salarié est obligatoire.",
      EMPLOYEE_LAST_NAME_REQUIRED: "Le nom du salarié est obligatoire.",
      EMPLOYEE_EMAIL_INVALID: "L'adresse électronique du salarié est invalide.",
      EMPLOYEE_EMAIL_DUPLICATE:
        "Un salarié avec cette adresse électronique existe déjà dans la société.",
      EMPLOYEE_TITLE_REQUIRED: "L'intitulé du salarié est obligatoire.",
      EMPLOYEE_TITLE_INVALID: "Intitulé de salarié invalide : {{title}}",
      EXPENSE_ITEM_UNKNOWN_CODE: "Type de frais inconnu : {{code}}",
      EXPENSE_ITEM_NOT_FOUND: "Poste introuvable.",
      EXPENSE_ITEM_LABEL_REQUIRED: "Le libellé du poste est obligatoire.",
      EXPENSE_ITEM_CODE_DUPLICATE:
        "Un poste avec le code « {{code}} » existe déjà.",
      EXPENSE_ITEM_PERIODICITY_INVALID:
        "Périodicité invalide : {{periodicity}}",
      EXPENSE_ITEM_CODE_INVALID: "Le code du poste est invalide.",
      EXPENSE_ITEM_REQUIRED: "Le type de frais est obligatoire.",
      EXPENSE_ITEM_SINGLE_USE:
        "Le poste « {{label}} » est à usage unique et ne peut pas être ajouté.",
      STATEMENT_AMOUNT_SOURCE_INVALID:
        "Source de montant invalide : {{source}}",
      STATEMENT_AI_CONFIDENCE_INVALID:
        "Niveau de confiance IA invalide : {{confidence}}",
      STATEMENT_LINES_REQUIRED:
        "Ajoutez au moins une ligne à la note de frais.",
      STATEMENT_NOT_FOUND: "Note de frais introuvable.",
      RECEIPT_NOT_FOUND: "Justificatif introuvable.",
      RECEIPT_IN_USE:
        "Ce justificatif est utilisé par une note de frais et ne peut pas être supprimé.",
      RENT_RECEIPT_NOT_FOUND: "Quittance introuvable.",
      RENT_RECEIPT_PDF_NOT_FOUND: "Le PDF de cette quittance est introuvable.",
      RENT_RECEIPT_TEMPLATE_INVALID:
        "Le template sélectionné n'est pas un template de quittance.",
      RENT_RECEIPT_PERIOD_INVALID:
        "La fin de période ne peut pas précéder le début.",
      SIGNATURE_MISSING:
        "Aucune signature configurée. Ajoutez une signature au bailleur dans la page LMNP.",
      SIGNATURE_NAME_REQUIRED: "Le nom de la signature est obligatoire.",
      SIGNATURE_NAME_TOO_LONG:
        "Le nom de la signature est trop long (255 caractères maximum).",
      SIGNATURE_FILE_REQUIRED: "Le fichier de signature est obligatoire.",
      SIGNATURE_FILE_UNREADABLE: "Impossible de lire le fichier de signature.",
      SIGNATURE_NOT_OWNED:
        "La signature sélectionnée n'appartient pas à cette personne.",
      SIGNATURE_COMPANY_REQUIRED: "La société de la signature est obligatoire.",
      SIGNATURE_NOT_CEO:
        "La signature sélectionnée n'appartient pas au gérant de cette société.",
      SIGNATURE_NOT_FOUND: "Signature introuvable.",
      FILE_NOT_FOUND: "Fichier introuvable.",
      FILE_ACCESS_DENIED: "Accès fichier refusé.",
      RECEIPT_FILE_REQUIRED: "Le fichier justificatif est obligatoire.",
      RECEIPT_EMPTY: "Le fichier est vide.",
      RECEIPT_TOO_LARGE: "Fichier trop volumineux (maximum 10 Mo).",
      RECEIPT_UNSUPPORTED_FORMAT:
        "Format non accepté. Formats autorisés : PDF, DOCX, XLSX/XLS, CSV, TXT, JPG, PNG.",
      RECEIPT_CONTENT_MISMATCH:
        "Le contenu du fichier ne correspond pas à son extension (« .{{extension}} »).",
      SIGNATURE_EMPTY: "Le fichier est vide.",
      SIGNATURE_TOO_LARGE: "Image trop volumineuse (maximum 2 Mo).",
      SIGNATURE_UNSUPPORTED_FORMAT:
        "La signature doit être une image PNG ou JPEG.",
      TEMPLATE_EMPTY: "Le fichier template est vide.",
      TEMPLATE_TOO_LARGE: "Template trop volumineux (maximum 5 Mo).",
      TEMPLATE_EXTENSION_INVALID:
        "Le template doit être un fichier HTML (.html).",
      TEMPLATE_NOT_TEXT: "Le template HTML doit être un fichier texte UTF-8.",
      TEMPLATE_ACTIVE_NOT_FOUND: "Aucun template actif pour {{type}}.",
      TEMPLATE_NOT_FOUND: "Template introuvable.",
      TEMPLATE_RENDER_FAILED: "Le template « {{name}} » n'a pas pu être rendu.",
      TEMPLATE_NAME_REQUIRED: "Le nom du template est obligatoire.",
      TEMPLATE_FILE_UNREADABLE: "Impossible de lire le fichier template.",
      TEMPLATE_BUILT_IN_NOT_DELETABLE:
        "Le modèle intégré ne peut pas être supprimé.",
      TEMPLATE_ACTIVE_NOT_DELETABLE:
        "Le template actif ne peut pas être supprimé. Activez d'abord un autre modèle.",
      TEMPLATE_BUILT_IN_NOT_FOUND: "Modèle intégré introuvable.",
      DOCUMENT_UNSUPPORTED_FORMAT:
        "Format de document non pris en charge pour l'analyse.",
      DOCUMENT_UNREADABLE: "Impossible de lire le document.",
      DOCUMENT_NO_TEXT:
        "Document illisible : aucun texte exploitable. Saisissez le montant manuellement.",
      DOCUMENT_NO_TEXT_NO_VISION:
        "Document sans texte exploitable et le modèle configuré ne gère pas les images. Choisissez un modèle de vision ou saisissez le montant manuellement.",
      ANALYSIS_NOT_FOUND: "Analyse introuvable.",
      ANALYSIS_ALREADY_FINISHED: "Cette analyse est déjà terminée.",
      LLM_CONFIG_NOT_FOUND: "Configuration LLM introuvable.",
      LLM_PROVIDER_UNKNOWN: "Fournisseur LLM inconnu.",
      LLM_PROVIDER_UNSUPPORTED:
        "Seul Ollama est pris en charge pour le moment.",
      LLM_TIMEOUT_OUT_OF_RANGE:
        "Le délai d'attente doit être compris entre 5 et 600 secondes.",
      LLM_TEMPERATURE_INVALID:
        "La température doit être un nombre entre 0 et 2.",
      LLM_TEMPERATURE_OUT_OF_RANGE:
        "La température doit être comprise entre 0 et 2.",
      LLM_CONTEXT_OUT_OF_RANGE:
        "La taille de contexte doit être comprise entre 1 024 et 131 072.",
      LLM_MAX_PAGES_OUT_OF_RANGE:
        "Le nombre de pages maximum doit être compris entre 1 et 20.",
      LLM_PROMPT_REQUIRED: "Le prompt d'extraction ne peut pas être vide.",
      LLM_URL_REQUIRED: "L'URL du service LLM est obligatoire.",
      LLM_URL_INVALID: "L'URL du service LLM est invalide.",
      LLM_URL_SCHEME_INVALID:
        "L'URL du service LLM doit commencer par http:// ou https://.",
      LLM_MODEL_REQUIRED:
        "Aucun modèle LLM n'est configuré. Renseignez-le dans Admin ou saisissez le montant manuellement.",
      LLM_EMPTY_RESPONSE:
        "Le modèle LLM n'a renvoyé aucun contenu exploitable.",
      LLM_URL_NOT_CONFIGURED: "L'URL du service LLM n'est pas configurée.",
      LLM_HTTP_ERROR: "Le service LLM a répondu {{status}}.",
      LLM_UNREACHABLE:
        "Le service LLM est injoignable. Vérifiez qu'Ollama est démarré, ou saisissez le montant manuellement.",
      LLM_RESPONSE_INVALID_JSON:
        "La réponse du modèle n'est pas un JSON valide. La saisie manuelle reste disponible.",
      LLM_RESPONSE_NOT_OBJECT:
        "La réponse du modèle n'est pas un objet JSON conforme. La saisie manuelle reste disponible.",
      LLM_RESPONSE_FIELD_NOT_ALLOWED:
        "La réponse du modèle contient un champ non autorisé (« {{field}} »). La saisie manuelle reste disponible.",
      LLM_RESPONSE_FIELD_MISSING:
        "La réponse du modèle ne respecte pas le schéma attendu (champ « {{field}} » absent).",
      LLM_RESPONSE_FIELD_INVALID:
        "La réponse du modèle ne respecte pas le schéma attendu (champ « {{field}} »).",
      LLM_RESPONSE_NO_JSON:
        "La réponse du modèle ne contient pas d'objet JSON. La saisie manuelle reste disponible.",
      STATEMENT_PDF_NOT_FOUND: "Le PDF demandé est introuvable.",
      STATEMENT_SIGNATURE_MISSING:
        "Aucune signature configurée pour le gérant. Ajoutez une signature au salarié gérant dans la page LMNP.",
      STATEMENT_TEMPLATE_INVALID:
        "Le template sélectionné n'est pas un template de note de frais.",
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
