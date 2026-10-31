export const fr = {
  common: {
    language: "Langue",
    languages: {
      fr: "Français",
      en: "English",
    },
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
  draft: {
    none: "Aucun brouillon enregistré",
    savedAt: "Brouillon enregistré le {{date}}",
    save: "Enregistrer le brouillon",
    saved: "Brouillon enregistré.",
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
        "Le fichier dépasse la taille maximale autorisée ({{maxJustificatif}} Mo pour un justificatif, {{maxTemplate}} Mo pour un modèle).",
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
      EMAIL_ALREADY_USED: "Un compte existe déjà avec cette adresse e-mail.",
      CONFIRMATION_TOKEN_INVALID:
        "Ce lien de confirmation est invalide ou a expiré.",
      INVALID_CREDENTIALS: "Adresse e-mail ou mot de passe incorrect.",
      EMAIL_NOT_CONFIRMED:
        "Confirmez votre adresse e-mail avant de vous connecter.",
      PASSWORD_TOO_LONG: "Le mot de passe ne peut pas dépasser 100 caractères.",
      INVALID_PASSWORD: "Le mot de passe actuel est incorrect.",
      PASSWORD_CHANGE_REQUIRED:
        "Changez votre mot de passe avant de continuer.",
      UNAUTHENTICATED:
        "Vous devez vous connecter pour accéder à cette ressource.",
      CSRF_INVALID:
        "Le jeton de sécurité est absent ou invalide. Rechargez la page.",
      ACCESS_DENIED: "Vous n'avez pas accès à cette action.",
      MODULE_COMPANY_DISABLED:
        "Le module société est désactivé pour ce compte.",
      MODULE_LMNP_DISABLED: "Le module LMNP est désactivé pour ce compte.",
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
      EXPENSE_ITEM_UNKNOWN_CODE: "Poste inconnu : {{code}}",
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
        "Le modèle sélectionné n'est pas un modèle de quittance.",
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
      TEMPLATE_EMPTY: "Le fichier du modèle est vide.",
      TEMPLATE_TOO_LARGE: "Modèle trop volumineux (maximum 5 Mo).",
      TEMPLATE_EXTENSION_INVALID:
        "Le modèle doit être un fichier HTML (.html).",
      TEMPLATE_NOT_TEXT: "Le modèle HTML doit être un fichier texte UTF-8.",
      TEMPLATE_ACTIVE_NOT_FOUND: "Aucun modèle actif pour {{type}}.",
      TEMPLATE_NOT_FOUND: "Modèle introuvable.",
      TEMPLATE_RENDER_FAILED: "Le modèle « {{name}} » n'a pas pu être rendu.",
      TEMPLATE_NAME_REQUIRED: "Le nom du modèle est obligatoire.",
      TEMPLATE_FILE_UNREADABLE: "Impossible de lire le fichier du modèle.",
      TEMPLATE_BUILT_IN_NOT_DELETABLE:
        "Le modèle intégré ne peut pas être supprimé.",
      TEMPLATE_ACTIVE_NOT_DELETABLE:
        "Le modèle actif ne peut pas être supprimé. Activez d'abord un autre modèle.",
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
        "Le modèle sélectionné n'est pas un modèle de note de frais.",
    },
  },
  navigation: {
    ariaLabel: "Navigation principale",
    mobileAriaLabel: "Navigation principale mobile",
    sections: {
      documents: "Documents",
      tracking: "Suivi",
      settings: "Réglages",
    },
    links: {
      rentReceipt: "Quittance",
      expenseStatement: "Note de frais",
      history: "Historique",
      templates: "Modèles",
      company: "Société",
      lmnp: "LMNP",
      aiAdmin: "Analyse IA",
      adminUsers: "Administration utilisateurs",
    },
  },
  auth: {
    loading: "Chargement…",
    login: {
      eyebrow: "Accès",
      title: "Connexion",
      description: "Connectez-vous à votre espace HomeOfficeExpenses.",
      submit: "Se connecter",
      noAccount: "Pas encore de compte ?",
      registerLink: "Créer un compte",
    },
    register: {
      eyebrow: "Inscription",
      title: "Créer un compte",
      description:
        "Inscrivez-vous : un e-mail de confirmation vous sera envoyé pour activer votre compte.",
      submit: "Créer le compte",
      hasAccount: "Vous avez déjà un compte ?",
      loginLink: "Se connecter",
      successTitle: "Inscription enregistrée",
      success:
        "Un e-mail de confirmation vient de vous être envoyé. Ouvrez le lien reçu pour activer votre compte.",
      resend: "Renvoyer l'e-mail de confirmation",
      resent: "E-mail de confirmation renvoyé.",
    },
    confirm: {
      eyebrow: "Confirmation",
      title: "Confirmer l'adresse e-mail",
      loading: "Confirmation en cours…",
      successTitle: "Adresse confirmée",
      success:
        "Votre adresse e-mail est confirmée. Vous pouvez maintenant vous connecter.",
      invalid: "Ce lien de confirmation est invalide ou a expiré.",
      missing: "Ce lien de confirmation est incomplet.",
      backToLogin: "Se connecter",
    },
    password: {
      eyebrow: "Sécurité",
      title: "Changer le mot de passe",
      description: "Choisissez un nouveau mot de passe.",
      forced:
        "Votre mot de passe provisoire doit être remplacé avant de continuer.",
      submit: "Changer le mot de passe",
      success: "Votre mot de passe a été changé.",
    },
    fields: {
      email: "Adresse e-mail",
      password: "Mot de passe",
      currentPassword: "Mot de passe actuel",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer le mot de passe",
    },
    validation: {
      emailRequired: "L'adresse e-mail est obligatoire.",
      emailInvalid: "L'adresse e-mail est invalide.",
      passwordRequired: "Le mot de passe est obligatoire.",
      passwordTooLong: "Le mot de passe ne peut pas dépasser 100 caractères.",
      currentPasswordRequired: "Le mot de passe actuel est obligatoire.",
      confirmRequired: "Confirmez le mot de passe.",
      confirmMismatch: "Les mots de passe ne correspondent pas.",
    },
  },
  shell: {
    skipLink: "Aller au contenu",
    tagline: "Quittances & frais d’occupation",
    localDataTitle: "Données locales",
    localDataText:
      "Aucune donnée ne quitte votre machine tant que l’URL du LLM reste locale.",
    footer: "HomeOfficeExpenses · usage personnel",
    accountAria: "Compte connecté",
    logout: "Se déconnecter",
    draftDialog: {
      title: "Modifications non enregistrées",
      message:
        "Des modifications de ce brouillon ne sont pas encore enregistrées. Que souhaitez-vous faire ?",
      confirm: "Quitter sans enregistrer",
      cancel: "Rester",
      save: "Enregistrer et quitter",
    },
  },
  rentReceipt: {
    page: {
      eyebrow: "Générer · Quittance",
      title: "Quittance de loyer",
      description:
        "Choisissez le mois et le bail : la période et les montants sont pré-remplis depuis le bail actif. Ajustez si besoin, puis générez le document définitif.",
      statementButton: "Note de frais du mois",
      tabsAriaLabel: "Volets de génération",
      inputTab: "Saisie",
      previewTab: "Aperçu",
    },
    form: {
      title: "Paramètres de la quittance",
      generate: "Générer la quittance",
      resumeLease: "Reprendre le bail",
      latestVersion:
        "Dernière version : v{{version}} → v{{next}} à la génération.",
      generating: "Génération en cours…",
      definitivePdf: "Le PDF définitif est enregistré dans l’historique.",
    },
    fields: {
      periodStart: "Début de période",
      periodEnd: "Fin de période",
      rentExclCharges: "Loyer hors charges",
      rentExclChargesHelp: "Modifiable pour une régularisation ponctuelle.",
      charges: "Provision pour charges",
      additionalCharges: "Charges supplémentaires",
      additionalChargeLabel: "Libellé",
      additionalChargeAmount: "Montant",
      addAdditionalCharge: "Ajouter une charge supplémentaire",
      saveAdditionalCharge: "Enregistrer la charge supplémentaire",
      cancelAdditionalCharge: "Annuler",
      editAdditionalCharge: "Modifier la charge supplémentaire {{index}}",
      removeAdditionalCharge: "Retirer la charge supplémentaire {{index}}",
      removeAdditionalChargeShort: "Retirer",
      estimatedTotal: "Total estimé",
      estimatedTotalNote:
        "Affichage estimé. Le total du PDF est recalculé avec arrondi au centime.",
      paymentDate: "Date de paiement",
      issueDate: "Date d’émission",
      leaseSourceHint:
        "Les coordonnées du bailleur, du locataire et du logement proviennent du bail sélectionné. Gérez les baux dans la",
      configurationLink: "configuration",
      month: "Mois concerné",
      monthHelp: "La période est recalculée automatiquement.",
      template: "Modèle",
      templateHelp: "Le modèle actif est utilisé par défaut.",
      versionedBadge: "Versionné",
      builtInTemplate: "Modèle intégré",
      activeSuffix: " (actif)",
      landlord: "Bailleur",
      landlordHelp: "Personne physique bailleur du bail actif.",
      landlordPlaceholder: "Sélectionnez un bailleur",
      tenant: "Locataire",
      tenantHelp: "Personne physique, ou société pour un bail société.",
      tenantPlaceholder: "Sélectionnez un locataire",
      personsGroup: "Personnes",
      companiesGroup: "Sociétés",
      missingLeaseBefore:
        "Aucun bail actif pour ce bailleur et ce locataire. Créez le bail dans la page",
      missingLeaseAfter: ".",
      lmnpLink: "LMNP",
      companyLeaseSelected: "Bail société sélectionné",
      leaseSelected: "Bail sélectionné",
      signature: "Signature",
      signatureHelp:
        "Signatures du bailleur sélectionné, apposées au bas du PDF.",
      signatureBadge: "PNG / JPEG",
      noSignature: "Aucune signature",
      signaturesError:
        "Les signatures n’ont pas pu être chargées : {{message}}",
      missingLandlordSignatureBefore:
        "Aucune signature pour ce bailleur. Ajoutez-en une dans sa fiche, page",
      lmnpPersonsLink: "LMNP · Personnes",
      missingLandlordSignatureAfter: ".",
    },
    preview: {
      incomplete:
        "Complétez les champs de la quittance pour actualiser l’aperçu.",
      missingLease:
        "Sélectionnez un bailleur et un locataire liés par un bail actif.",
      missingSignature: "Configurez une signature pour afficher l’aperçu.",
      templateAria: "Modèle de la quittance",
      builtInTemplate: "Modèle intégré",
      note: "L’aperçu est rendu par le backend à partir du modèle actif. Il porte un filigrane et n’est jamais enregistré.",
    },
    result: {
      title: "Quittance générée",
      meta: "{{month}} · version {{version}} · {{total}}",
      recorded:
        "Enregistrée dans l’historique avec le modèle « {{name}} » v{{version}}.",
      builtInTemplate: "modèle intégré",
      download: "Télécharger le PDF",
      open: "Ouvrir",
      goToStatement: "Aller à la note de frais de ce mois",
    },
    banner: {
      title: "Quittance déjà active pour ce bailleur et ce locataire",
      text: "Total {{total}}, version {{version}}. Générer à nouveau crée une nouvelle quittance active (version {{next}}).",
      openPdf: "Ouvrir le PDF",
    },
    toasts: {
      generated: "Quittance de {{month}} générée en version {{version}}.",
      amountsResumed: "Montants repris depuis le bail.",
    },
    tenantOptions: {
      personFallback: "Personne",
      companyFallback: "Société",
    },
    validation: {
      month: "Choisissez un mois valide.",
      landlord: "Sélectionnez un bailleur.",
      tenant: "Sélectionnez un locataire.",
      periodStart: "Date de début invalide.",
      periodEnd: "Date de fin invalide.",
      rentExclCharges: "Loyer hors charges invalide.",
      charges: "Provision pour charges invalide.",
      additionalChargeLabel:
        "Le libellé de la charge supplémentaire est obligatoire.",
      additionalChargeLabelTooLong:
        "Le libellé de la charge supplémentaire ne peut pas dépasser 120 caractères.",
      additionalChargeAmount:
        "Le montant de la charge supplémentaire doit être strictement positif.",
      additionalChargeLimit:
        "Une quittance accepte au maximum 20 charges supplémentaires.",
      date: "Date invalide (JJ/MM/AAAA).",
      periodOrder: "La fin de période doit être postérieure au début.",
    },
  },
  pdfViewer: {
    title: "Aperçu du document",
    watermark: "Filigrane « APERÇU » — rien n’est enregistré.",
    updatedAt: "Mis à jour à {{date}}",
    loadError: "Impossible d'afficher l'aperçu PDF.",
    loadingDocument: "Chargement du PDF…",
    preparing: "Préparation de l’aperçu…",
    empty: "L’aperçu apparaîtra ici dès que les informations seront complètes.",
    updating: "Mise à jour de l’aperçu…",
    previousVersion: "L’ancienne version reste affichée.",
    previousPage: "Page précédente",
    nextPage: "Page suivante",
    zoomOut: "Réduire le zoom",
    zoomIn: "Agrandir le zoom",
    pageLabel: "Page {{current}} / {{total}}",
    download: "Télécharger l’aperçu",
  },
  templates: {
    page: {
      eyebrow: "Réglages",
      title: "Modèles",
      description:
        "Personnalisez les documents générés sans toucher au calcul : le backend fournit les montants déjà formatés, votre modèle HTML ne fait que les mettre en page.",
      warning:
        "Les modèles ne peuvent exécuter aucun code : Mustache sans logique, HTML assaini, images en data URI uniquement, aucune ressource distante. Un fichier refusé affiche les erreurs de validation sans être enregistré.",
    },
    types: {
      rentReceipt: {
        title: "Quittance de loyer",
        description: "Modèle utilisé pour les quittances mensuelles.",
      },
      expenseStatement: {
        title: "Note de frais d’occupation",
        description:
          "Modèle utilisé pour les notes de frais et leur version complète.",
      },
    },
    card: {
      loading: "Chargement des modèles…",
      downloadDefault: "Télécharger le modèle par défaut intégré",
      resetDefault: "Revenir au modèle par défaut",
      resetDefaultBlocked: "Le modèle intégré est déjà actif.",
      note: "Un seul modèle actif par type. Les documents déjà générés conservent la référence de leur version. La suppression est logique : aucune version n’est réellement effacée.",
      deleteDialog: {
        title: "Supprimer cette version ?",
        message:
          "La version v{{version}} de « {{name}} » ne sera plus proposée. Les documents qui l’utilisent restent inchangés.",
      },
      resetDialog: {
        title: "Revenir au modèle par défaut ?",
        message:
          "Le modèle intégré « {{name}} » (v{{version}}) redeviendra actif. Vos versions importées restent disponibles.",
        messageFallback:
          "Le modèle intégré redeviendra actif. Vos versions importées restent disponibles.",
        confirm: "Restaurer le modèle",
      },
    },
    actions: {
      preview: "Aperçu",
      download: "Télécharger",
      activate: "Activer",
      delete: "Supprimer",
      restoreBuiltIn: "Restaurer le modèle intégré",
    },
    badges: {
      builtIn: "intégré",
      active: "active",
    },
    active: {
      eyebrow: "Modèle actif",
      importedOn: "importé le {{date}}",
      empty: "Aucun modèle actif.",
    },
    versions: {
      title: "Versions",
      count_one: "{{count}} version",
      count_other: "{{count}} versions",
      empty: "Aucune version précédente archivée.",
      deleteBuiltInTitle: "Le modèle intégré ne peut pas être supprimé.",
      deleteActiveTitle: "Le modèle actif ne peut pas être supprimé.",
      followupPreview: "Aperçu de la version v{{version}}",
      followupActivate: "Activer la version v{{version}}",
      name: "Modèle",
      versionColumn: "Version",
      importedAt: "Importé le",
      actions: "Actions",
    },
    import: {
      title: "Importer une nouvelle version",
      intro:
        "Fichier HTML UTF-8, 5 Mo maximum. Le nouveau modèle est validé puis importé sans être activé : vous pouvez d’abord l’aperçu avec des données d’exemple.",
      nameLabel: "Nom de la version",
      namePlaceholder: "Ex. Quittance — version 2027",
      dropzoneText: "Déposez votre modèle HTML",
      dropzoneAria: "Choisir un fichier de modèle HTML",
      submit: "Valider et importer",
      note: "Une version importée doit être activée explicitement.",
    },
    report: {
      title: "Rapport de validation",
      structureValid: "Structure valide",
      structureInvalid: "Structure invalide",
      recognized: "Variables reconnues ({{count}})",
      unknown: "Variables inconnues ({{count}})",
      missing: "Obligatoires manquantes ({{count}})",
      errors: "Erreurs",
      warning:
        "Avertissement : le modèle sera accepté, mais les champs obligatoires absents apparaîtront vides dans le document.",
    },
    preview: {
      title: "Aperçu — {{name}} · v{{version}}",
      subtitle:
        "Données d’exemple · filigrane « APERÇU » · rien n’est persisté.",
      activate: "Activer ce modèle",
      closeAria: "Fermer l’aperçu",
    },
    compare: {
      title: "Comparer les versions",
      subtitle: "Aperçu côte à côte de deux versions du modèle.",
      select: "Comparer {{name}} v{{version}}",
      selection_one: "{{count}} version sélectionnée",
      selection_other: "{{count}} versions sélectionnées",
      action: "Comparer",
      clear: "Annuler",
      closeAria: "Fermer la comparaison",
      loading: "Préparation des aperçus…",
    },
    reference: {
      title: "Référence des variables",
      show: "Afficher",
      hide: "Masquer",
      loading: "Chargement des variables…",
      intro:
        "Les montants sont déjà formatés en français par le backend : le modèle ne calcule rien. Les expressions non échappées, scripts, iframes, ressources distantes et expressions Thymeleaf/JSP sont refusés.",
      loopTitle: "Boucle des frais",
      loopBefore: "Dans la boucle",
      loopAfter: ", les variables internes s’écrivent",
      loopAnd: "et",
      variable: "Variable",
      description: "Description",
      example: "Exemple",
      copy: "Copier",
      required: "requis",
      copyAria: "Copier la variable {{name}}",
      copied: "{{variable}} copié dans le presse-papiers.",
      copyError:
        "Impossible de copier dans le presse-papiers. Sélectionnez la variable manuellement.",
    },
    toasts: {
      imported:
        "Version v{{version}} importée. Vérifiez l’aperçu puis activez-la.",
      activated: "Le modèle « {{name}} » v{{version}} est désormais actif.",
      deleted: "Version supprimée. Le fichier reste archivé côté stockage.",
      reset: "Modèle intégré restauré et activé (v{{version}}).",
    },
  },
  history: {
    page: {
      eyebrow: "Suivi",
      title: "Historique",
      description:
        "Toutes les versions de vos quittances et notes de frais, toutes sociétés confondues, classées par mois. Les versions archivées restent téléchargeables et consultables.",
      monthCount_one: "{{count}} mois suivi",
      monthCount_other: "{{count}} mois suivis",
      loading: "Chargement de l’historique…",
      noCompanyTitle: "Aucune société configurée",
      noCompanyDescription:
        "Créez une société dans la configuration pour consulter son historique.",
      reloaded: "Lignes de {{month}} rechargées dans le brouillon.",
    },
    empty: {
      title: "Aucun document pour le moment",
      description:
        "Générez une quittance ou une note de frais : elle apparaîtra ici, avec toutes ses versions.",
      createRentReceipt: "Générer une quittance",
      createStatement: "Générer une note de frais",
    },
    reloadDialog: {
      title: "Rouvrir cette note ?",
      message:
        "Les lignes de la version {{version}} de {{month}} remplaceront le brouillon de ce mois dans l’onglet Note de frais. Les brouillons des autres mois sont conservés.",
      confirm: "Charger les lignes",
    },
    month: {
      eyebrow: "Mois",
      rentReceiptCount_one: "Quittance ({{count}})",
      rentReceiptCount_other: "Quittance ({{count}})",
      rentReceiptMissing: "Quittance non générée",
      statementCount_one: "Note ({{count}})",
      statementCount_other: "Note ({{count}})",
      statementMissing: "Note non générée",
      rentReceiptColumn: "Quittance de loyer",
      statementColumn: "Note de frais d’occupation",
      emptyRentReceipts: "Aucune quittance générée pour ce mois.",
      emptyStatements: "Aucune note de frais générée pour ce mois.",
    },
    address: {
      unknown: "Adresse inconnue",
      unknownLandlord: "Bailleur inconnu",
      unknownTenant: "Locataire inconnu",
    },
    actions: {
      open: "Ouvrir",
      load: "Charger",
      pdf: "PDF",
      received: "Reçue",
      complete: "Complète",
      downloadPdf: "Télécharger le PDF",
      downloadComplete: "Note complète (ZIP)",
    },
    versions: {
      version: "Version",
      parties: "Parties",
      date: "Date",
      amount: "Montant",
      actions: "Actions",
    },
  },
  settings: {
    list: {
      filterLabel: "Filtrer la liste",
      sortLabel: "Trier par",
      ascending: "Tri croissant",
      descending: "Tri décroissant",
      clear: "Effacer le filtre",
      noMatch: "Aucun résultat pour « {{query}} ».",
      count: "{{visible}} sur {{total}}",
    },
    page: {
      eyebrow: "Réglages",
      title: "Société",
      description:
        "Gérez vos sociétés, leurs salariés signataires et leurs postes de frais. Les calculs restent effectués par le backend.",
    },
    company: {
      selectAria: "Société à configurer",
      newCompany: "Nouvelle société",
      deleteButton: "Supprimer",
      tabsAria: "Sections de la société",
      tabs: {
        identification: "Info générale",
        leaseExpenses: "Baux & Frais",
        employees: "Salariés",
      },
      loading: "Chargement des sociétés…",
      empty: "Aucune société configurée. Créez la première société.",
      deleted: "Société supprimée.",
      deleteDialog: {
        title: "Supprimer cette société ?",
        message:
          "« {{name}} » et ses salariés seront supprimés. Ses baux seront détachés, sans être supprimés. Une société utilisée par des notes de frais ou des quittances ne peut pas être supprimée.",
        confirm: "Supprimer la société",
        fallbackName: "Cette société",
      },
      identity: {
        sectionTitle: "Identité de la société",
        sectionDescription:
          "Nom, forme juridique et siège utilisés en en-tête des documents.",
        viewDescription:
          "Valeurs utilisées en en-tête des quittances et notes de frais.",
        edit: "Modifier",
        fields: {
          name: "Raison sociale",
          legalForm: "Forme juridique",
          siren: "SIREN",
          managerName: "Gérant",
          companyAddress: "Adresse de la société",
          address: "Adresse",
          issuePlace: "Lieu d’émission",
        },
        sirenHelp: "9 chiffres, espaces autorisés.",
        modal: {
          create: "Nouvelle société",
          edit: "Modifier la société",
        },
        toasts: {
          created: "Société créée.",
          saved:
            "Société enregistrée. Les prochains documents utiliseront ces valeurs.",
        },
      },
      validation: {
        name: "Le nom de la société est obligatoire.",
        siren: "Le SIREN doit comporter 9 chiffres.",
      },
      leaseTab: {
        title: "Baux de la société",
        description: "Une société peut posséder plusieurs baux.",
        columns: {
          address: "Adresse",
          landlord: "Bailleur",
          rent: "Loyer",
          charges: "Charges",
          actions: "Actions",
        },
        add: "Ajouter un bail",
        filterPlaceholder: "Filtrer les baux…",
        loading: "Chargement des baux…",
        empty:
          "Aucun bail pour cette société. Ajoutez le premier bail avec « Ajouter un bail ».",
        addressFallback: "Bail sans adresse",
        expenses: "Modifier les frais",
        addExpenses: "Ajouter des frais",
        expensesTitle: "Frais du bail",
        edit: "Modifier le bail",
      },
    },
    lease: {
      section: {
        title: "Baux et adresses",
        description:
          "Une adresse peut porter plusieurs baux. Sélectionnez une adresse pour afficher ses baux et fixer le loyer et les charges.",
        columns: {
          lease: "Bail",
          company: "Société",
          rent: "Loyer",
          charges: "Charges",
          total: "Total",
          actions: "Actions",
        },
        add: "Ajouter un bail",
        filterPlaceholder: "Filtrer les baux…",
        addressLabel: "Adresse des baux",
        loadingAddresses: "Chargement des adresses…",
        noAddress: "Aucune adresse configurée",
        loading: "Chargement des baux…",
        empty:
          "Aucun bail pour cette adresse. Ajoutez un bail pour générer des quittances.",
        company: "Société : {{company}}",
        noCompany: "Aucune société",
        amounts: "Loyer {{rent}} · charges {{charges}} · total",
        editAria: "Modifier le bail {{id}}",
        edit: "Modifier",
        removeAria: "Supprimer le bail {{id}}",
        remove: "Retirer",
        receiptAria: "Quittance du bail {{id}}",
        receipt: "Quittance",
        signaturePending: "Vérification des signatures…",
        signatureMissing:
          "Aucune signature enregistrée pour ce bailleur. Ajoutez-en une dans l’onglet « Personnes » pour générer une quittance.",
        deleted: "Bail supprimé.",
        deleteDialog: {
          title: "Supprimer ce bail ?",
          message:
            "Le bail de « {{tenant}} » ne sera plus proposé lors de la génération. Les quittances existantes restent inchangées.",
          confirm: "Supprimer le bail",
          fallbackTenant: "ce locataire",
        },
      },
      form: {
        createTitle: "Ajouter un bail",
        editTitle: "Modifier le bail",
        companyLeaseLabel: "Bail société",
        companyLeaseHint:
          "Le locataire est une société : renseignez les surfaces du logement pour calculer la quote-part professionnelle.",
        landlord: "Bailleur",
        landlordPlaceholder: "Sélectionnez un bailleur",
        companyTenant: "Locataire (société)",
        companyPlaceholder: "Sélectionnez une société",
        companySiren: "SIREN de la société locataire",
        companySirenPlaceholder: "123 456 789",
        companyLookup: "Rechercher",
        companyLookupHint:
          "Une société détenue par un autre compte peut être liée avec son SIREN. Seules ses informations légales publiques sont affichées.",
        companyLookupSiren: "SIREN",
        companyLookupLegalForm: "Forme juridique",
        companyLookupAddress: "Siège social",
        companyLookupManager: "Représentant légal",
        tenant: "Locataire",
        tenantPlaceholder: "Sélectionnez un locataire",
        address: "Adresse du bien",
        addressPlaceholder: "12 rue de la République, 75000 Paris",
        rentExclCharges: "Loyer hors charges (€)",
        rentExclChargesPlaceholder: "900,00",
        charges: "Provision pour charges (€)",
        chargesPlaceholder: "50,00",
        totalArea: "Surface totale (m²)",
        totalAreaPlaceholder: "70,00",
        businessArea: "Surface professionnelle (m²)",
        businessAreaPlaceholder: "25,00",
        total: "Total quittance",
        totalHint:
          "Indicatif : loyer + provision. Le total de la quittance est calculé par le backend.",
        toasts: {
          created: "Bail ajouté.",
          updated: "Bail mis à jour.",
        },
      },
      receiptModal: {
        title: "Quittance de loyer",
        closeAria: "Fermer la fenêtre",
        landlord: "Bailleur",
        tenant: "Locataire",
        company: "Société",
        property: "Bien",
        noCompany: "Aucune société",
        month: "Mois",
        monthHelp: "La période se déduit du mois choisi.",
        period: "Période :",
        rentExclCharges: "Loyer hors charges",
        rentExclChargesHelp: "Modifiable pour une régularisation ponctuelle.",
        charges: "Provision pour charges",
        resultTitle: "Quittance générée",
        resultMeta: "{{month}} · version {{version}} · {{total}}",
        download: "Télécharger le PDF",
        close: "Fermer",
        generate: "Générer la quittance",
      },
      validation: {
        landlord: "Sélectionnez un bailleur.",
        propertyAddress: "L'adresse du bien est obligatoire.",
        rentExclCharges: "Loyer hors charges invalide.",
        charges: "Provision pour charges invalide.",
        totalAreaInvalid: "Surface totale invalide.",
        businessAreaInvalid: "Surface professionnelle invalide.",
        companyTenant: "Sélectionnez la société locataire.",
        tenant: "Sélectionnez un locataire.",
        partiesIdentical:
          "Le bailleur et le locataire doivent être deux personnes distinctes.",
        totalAreaRequired:
          "La surface totale est obligatoire pour un bail société.",
        businessAreaRequired:
          "La surface professionnelle est obligatoire pour un bail société.",
        businessAreaTooLarge:
          "La surface professionnelle ne peut pas dépasser la surface totale.",
      },
    },
    history: {
      receipts: {
        title: "Quittances générées",
        loading: "Chargement des quittances…",
        empty: "Aucune quittance générée pour ce bail.",
        count_one: "{{count}} quittance",
        count_other: "{{count}} quittances",
      },
    },
    lmnp: {
      eyebrow: "Réglages",
      title: "LMNP",
      description:
        "Baux et adresses du logement, et personnes physiques bailleurs ou locataires avec leurs signatures.",
      tabsAria: "Sections LMNP",
      tabs: {
        leases: "Baux et adresses",
        persons: "Personnes",
      },
    },
    employees: {
      title: "Salariés",
      description:
        "Les salariés appartiennent à la société sélectionnée. Leur intitulé est descriptif et ne donne encore aucun droit.",
      columns: {
        employee: "Salarié",
        title: "Intitulé",
        contact: "Coordonnées",
        signatures: "Signatures",
        actions: "Actions",
      },
      add: "Ajouter un salarié",
      filterPlaceholder: "Filtrer les salariés…",
      selectCompany: "Sélectionnez une société pour gérer ses salariés.",
      loading: "Chargement des salariés…",
      empty:
        "Aucun salarié dans cette société. Ajoutez le gérant et les salariés signataires.",
      addressFallback: "Adresse non renseignée",
      signatureCount_one: "{{count}} signature",
      signatureCount_other: "{{count}} signatures",
      edit: "Modifier",
      remove: "Retirer",
      editAria: "Modifier le salarié {{name}}",
      removeAria: "Supprimer le salarié {{name}}",
      deleted: "Salarié supprimé.",
      deleteDialog: {
        title: "Supprimer ce salarié ?",
        message:
          "« {{name}} » ne sera plus proposé. Un salarié porteur de signatures ne peut pas être supprimé.",
        confirm: "Supprimer le salarié",
      },
      titles: {
        CEO: "PDG",
        CFO: "DAF",
        ACCOUNTANT: "Comptable",
        EMPLOYEE: "Salarié",
      },
      form: {
        createTitle: "Ajouter un salarié",
        editTitle: "Modifier le salarié",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Adresse électronique",
        emailHelp: "Facultative ; unique dans la société.",
        title: "Intitulé",
        titleHelp: "Descriptif : il ne donne encore aucun droit.",
        issuePlace: "Lieu d’émission",
        issuePlaceHelp:
          "Imprimé sur la note de frais ; à défaut, le lieu de la société est utilisé.",
        address: "Adresse personnelle",
        addressHelp: "Facultative.",
        hint: "Enregistrez le salarié pour ajouter ses signatures sans fermer cette fenêtre.",
        created: "Salarié ajouté.",
        updated: "Salarié mis à jour.",
      },
      validation: {
        firstName: "Le prénom du salarié est obligatoire.",
        lastName: "Le nom du salarié est obligatoire.",
        email: "L'adresse électronique du salarié est invalide.",
        title: "L'intitulé du salarié est obligatoire.",
      },
    },
    expenses: {
      title: "Postes",
      description:
        "Libellés, fournisseurs, prorata par défaut et périodicité alimentent la note de frais. Suppression logique uniquement.",
      add: "Ajouter un poste",
      filterPlaceholder: "Filtrer les postes…",
      loading: "Chargement des postes…",
      empty:
        "Aucun poste configuré. Ajoutez au moins « Loyer » et vos frais courants.",
      table: {
        label: "Libellé",
        supplier: "Fournisseur",
        proRata: "Prorata",
        periodicity: "Périodicité",
        order: "Ordre",
        options: "Options",
        actions: "Actions",
      },
      inactive: "inactif",
      multipleLines: "multi-lignes",
      singleLine: "une ligne",
      edit: "Modifier",
      remove: "Retirer",
      deleted: "Poste désactivé et retiré de la liste des frais.",
      deleteDialog: {
        title: "Retirer ce poste ?",
        message:
          "« {{label}} » ne sera plus proposé dans la note de frais. Les documents existants conservent leurs lignes et leurs montants.",
        confirm: "Retirer le poste",
      },
      periodicity: {
        MONTHLY: "Mensuelle",
        BIMONTHLY: "Bimestrielle",
        ANNUAL: "Annuelle",
      },
      form: {
        createTitle: "Ajouter un poste",
        editTitle: "Modifier le poste",
        code: "Code",
        codeHelpEdit: "Le code est immuable après création.",
        codeHelpCreate: "Facultatif : généré depuis le libellé si vide.",
        label: "Libellé affiché",
        supplier: "Fournisseur",
        proRata: "Prorata par défaut (%)",
        proRataHelp:
          "Pré-remplit le champ lors de l’ajout d’un frais ; modifiable au cas par cas.",
        periodicity: "Périodicité",
        order: "Ordre d’affichage",
        active: "Poste actif",
        activeDescription:
          "Apparaît dans la liste déroulante de la note de frais.",
        multipleLines: "Plusieurs lignes autorisées",
        multipleLinesDescription:
          "Autorise plusieurs frais de ce type pour un même mois (ex. téléphone).",
        created: "Poste « {{label}} » ajouté à la liste des frais.",
        updated: "Poste « {{label}} » mis à jour.",
      },
      validation: {
        code: "Code invalide : lettres, chiffres, tirets et underscores uniquement.",
        label: "Le libellé est obligatoire.",
        proRata: "Prorata attendu entre 0 et 100.",
        sortOrderInteger: "Ordre invalide.",
        sortOrderMin: "L'ordre doit être positif.",
      },
    },
    people: {
      title: "Personnes",
      description:
        "Personnes physiques utilisées comme bailleur ou locataire d’un bail. Chaque personne peut porter ses signatures.",
      columns: {
        person: "Personne",
        address: "Adresse",
        signatures: "Signatures",
        actions: "Actions",
      },
      add: "Ajouter une personne",
      filterPlaceholder: "Filtrer les personnes…",
      loading: "Chargement des personnes…",
      empty:
        "Aucune personne configurée. Ajoutez le bailleur ou le locataire du logement.",
      nameFallback: "Personne",
      editFallback: "la personne",
      addressFallback: "Adresse non renseignée",
      signatureCount_one: "{{count}} signature",
      signatureCount_other: "{{count}} signatures",
      edit: "Modifier",
      remove: "Retirer",
      editAria: "Modifier {{name}}",
      removeAria: "Supprimer {{name}}",
      deleted: "Personne supprimée.",
      deleteDialog: {
        title: "Supprimer cette personne ?",
        message:
          "« {{name}} » ne sera plus proposée. Une personne utilisée par un bail actif ou porteuse de signatures ne peut pas être supprimée : retirez d’abord ses signatures.",
        confirm: "Supprimer la personne",
        fallbackName: "Cette personne",
      },
      form: {
        createTitle: "Ajouter une personne",
        editTitle: "Modifier une personne physique",
        name: "Nom de la personne",
        address: "Adresse",
        addressHelp: "Facultative ; reprise dans les documents.",
        issuePlace: "Lieu d’émission",
        issuePlaceHelp:
          "Facultatif ; imprimé après « Fait à » sur les quittances. Vide : le lieu de la société du bail.",
        hint: "Enregistrez la personne pour ajouter ses signatures sans fermer cette fenêtre.",
        saved:
          "Personne enregistrée. Ajoutez ou retirez ses signatures ci-dessous.",
        created: "Personne « {{name}} » ajoutée.",
        updated: "Personne « {{name}} » mise à jour.",
      },
      validation: {
        name: "Le nom de la personne est obligatoire.",
      },
    },
    signatures: {
      title: "Signatures",
      hint: "Images PNG ou JPEG, 2 Mo maximum. Suppression logique uniquement.",
      nameLabel: "Nom de la signature",
      nameHelp: "Affiché dans la liste déroulante des documents.",
      namePlaceholder: "Signature du bailleur",
      nameRequired: "Le nom de la signature est obligatoire.",
      fileRequired: "Sélectionnez une image PNG ou JPEG.",
      invalidFormat: "Format non accepté. Formats : PNG, JPEG.",
      tooLarge: "Fichier trop volumineux (2 Mo maximum).",
      add: "Ajouter la signature",
      loading: "Chargement des signatures…",
      empty:
        "Aucune signature enregistrée. Ajoutez une image pour signer les documents de cette personne.",
      fallbackName: "Signature",
      addedOn: "Ajoutée le {{date}}",
      imageAlt: "Signature {{name}}",
      removeAria: "Supprimer {{name}}",
      removeFallbackName: "la signature",
      remove: "Retirer",
      keepSeveral: "Une personne peut conserver plusieurs signatures.",
      deleted: "Signature supprimée.",
      added: "Signature « {{name}} » ajoutée.",
      deleteDialog: {
        title: "Supprimer cette signature ?",
        message:
          "« {{name}} » ne sera plus proposée dans les documents. Les documents existants restent inchangés.",
        confirm: "Supprimer la signature",
        fallbackName: "Cette signature",
      },
      dropzone: {
        text: "Déposez l’image de la signature",
        formats: "PNG, JPEG",
        ariaLabel: "Choisir une image de signature",
      },
      previewAlt: "Aperçu de {{name}}",
      removeImageAria: "Retirer l’image de la signature",
      draw: "Dessiner une signature",
      generate: "Générer une signature",
      rename: "Renommer",
      renameAria: "Renommer {{name}}",
      renamed: "Signature renommée.",
      renameTitle: "Renommer la signature",
      drawnName: "Signature dessinée",
      pad: {
        title: "Dessiner une signature",
        hint: "Tracez votre signature à la souris, au stylet ou au doigt.",
        canvasLabel: "Zone de dessin de la signature",
        clear: "Effacer",
        note: "L’image est exportée en PNG transparent, recadrée sur le tracé.",
        blank:
          "La zone de dessin est vide. Tracez votre signature avant de valider.",
      },
      font: {
        title: "Générer une signature",
        textLabel: "Texte de la signature",
        textPlaceholder: "Prénom Nom",
        textHelp:
          "Le texte est écrit en style cursif, puis exporté en PNG transparent.",
        textRequired: "Saisissez le texte de la signature.",
        styleLabel: "Style cursif",
        previewFallback: "Votre signature",
        exportFailed: "Impossible de générer l’image de la signature.",
      },
    },
  },
  adminUsers: {
    page: {
      eyebrow: "Administration",
      title: "Utilisateurs",
      description:
        "Activez les modules Société et LMNP de chaque compte et ajustez son rôle.",
      loading: "Chargement des comptes…",
      empty: "Aucun compte local.",
      tableCaption: "Comptes locaux, rôles et modules activés",
      email: "Adresse e-mail",
      role: "Rôle",
      modules: "Modules",
      companyModule: "Module société",
      lmnpModule: "Module LMNP",
      roles: {
        admin: "Administrateur",
        user: "Utilisateur",
      },
      modulesUpdated: "Modules du compte mis à jour.",
      roleUpdated: "Rôle du compte mis à jour.",
      self: "Vous",
    },
  },
  adminLlm: {
    page: {
      eyebrow: "Réglages",
      title: "Analyse IA",
      loading: "Chargement de la configuration IA…",
      description:
        "Ollama reste local par défaut. Le modèle ne fait que proposer une extraction : tous les montants sont vérifiés et calculés par le backend.",
      testConnection: "Tester la connexion",
      save: "Enregistrer",
    },
    connection: {
      title: "Connexion Ollama",
      subtitle:
        "Fournisseur local, URL, modèle et authentification éventuelle.",
      enabled: "Analyse IA activée",
      disabled: "Analyse IA désactivée",
      toggleAria: "Activer l’analyse par IA",
      notice:
        "Quand l’IA est désactivée, aucun justificatif n’est envoyé. Toute la saisie manuelle reste disponible.",
      provider: "Fournisseur",
      providerOllama: "Ollama (local)",
      providerOpenAi: "Compatible OpenAI — phase 2",
      urlLabel: "URL du serveur Ollama",
      urlHelp:
        "Par défaut : http://host.docker.internal:11434. L’URL est enregistrée automatiquement lorsque la liste des modèles est actualisée.",
      refreshAria: "Actualiser la liste des modèles",
      refresh: "Actualiser",
      modelLabel: "Modèle",
      unknownFamily: "Famille inconnue",
      visionSuffix: " · accepte les images",
      visionTag: " · vision",
      configuredTag: " (configuré)",
      modelHelp:
        "La liste est chargée depuis /api/tags. Vous pouvez saisir un nom manuellement si Ollama est injoignable.",
      loadingModels: "Chargement des modèles…",
      selectModel: "Sélectionnez un modèle",
      manualEntry: "Saisie manuelle…",
      chooseFromList: "Choisir dans la liste",
      visionTitle: "Support des images",
      visionAccepted:
        "Ce modèle accepte les images : les photos et scans peuvent être analysés.",
      visionRejected:
        "Ce modèle n’est pas signalé comme multimodal. Les PDF texte restent analysables ; les images nécessitent un modèle vision ou l’OCR.",
      configuredWarning:
        "Ce modèle configuré n’apparaît pas dans la liste du serveur. Vérifiez qu’il est installé.",
      modelsErrorTitle: "Liste des modèles indisponible.",
      modelsErrorHint:
        "Saisissez le nom du modèle manuellement, puis testez la connexion.",
      footerNote:
        "« Tester la connexion » enregistre d’abord les réglages affichés, puis interroge le serveur.",
      testConnection: "Tester la connexion",
      save: "Enregistrer",
    },
    advanced: {
      title: "Paramètres avancés",
      subtitle:
        "Délai, température, contexte, pages analysées, OCR et prompt d’extraction.",
      show: "Afficher",
      hide: "Masquer",
      timeoutLabel: "Délai (secondes)",
      temperatureLabel: "Température",
      temperatureHelp: "0 = réponses déterministes, recommandé.",
      numCtxLabel: "Contexte (num_ctx)",
      maxPagesLabel: "Pages max analysées",
      ocrTitle: "OCR Tesseract en secours",
      ocrText:
        "À activer si Tesseract est installé sur le serveur : extrait le texte des justificatifs image ou scannés avant l’analyse.",
      promptLabel: "Prompt d’extraction",
      resetPrompt: "Réinitialiser le prompt par défaut",
      promptHint:
        "Le prompt système interdit au modèle d’obéir aux instructions contenues dans un document et impose un JSON validé par le serveur. Le modèle ne calcule jamais de montant.",
      defaultsNote:
        "Les valeurs par défaut conviennent à un usage local : 120 s, température 0, contexte 8 192 et 5 pages. Un délai trop court interrompt l’analyse sans bloquer la saisie manuelle.",
    },
    apiKey: {
      title: "Clé API (facultative)",
      hint: "Jamais renvoyée par le serveur ni réaffichée. Laissez vide pour conserver la clé enregistrée.",
      configured: "Clé configurée",
      none: "Aucune clé",
      newKey: "Nouvelle clé API",
      placeholderConfigured: "Clé enregistrée — laisser vide",
      placeholderNone: "Aucune clé enregistrée",
      deleteTitle: "Supprimer la clé enregistrée",
      deleteText:
        "Envoie explicitement une clé vide. Sans cette case, une clé vide n’est jamais transmise.",
    },
    remote: {
      title: "Les justificatifs seront envoyés à un serveur distant.",
      textBefore: "L’URL configurée n’est ni ",
      localhost: "localhost",
      textMiddle: ", ni ",
      dockerHost: "host.docker.internal",
      textAfter:
        ", ni une IP privée. N’utilisez cette option que si vous acceptez ce transfert.",
    },
    saveBar: {
      dirty: "Modifications non enregistrées.",
      clean: "Configuration à jour.",
      save: "Enregistrer la configuration IA",
    },
    status: {
      eyebrow: "État de l’analyse IA",
      title: "Connexion Ollama",
      verifying: "Vérification…",
      unavailable: "Indisponible",
      unknown: "Inconnu",
      querying: "Interrogation du serveur Ollama…",
      reachable: "Serveur joignable",
      unreachable: "Serveur non joignable",
      none: "—",
      activeSuffix: " · IA activée",
      inactiveSuffix: " · IA désactivée",
      refresh: "Actualiser",
      ready: "Connecté",
      readyDescription:
        "Le serveur Ollama et le modèle configuré sont disponibles.",
      remote: "Connecté — serveur distant",
      remoteDescription:
        "Ollama répond, mais l’URL n’est pas locale : les documents quittent cette machine.",
      missingModel: "Modèle absent",
      missingModelDescription:
        "Ollama répond mais le modèle sélectionné n’est pas installé.",
      unreachableStatus: "Injoignable",
      unreachableDescription:
        "Le serveur Ollama ne répond pas. La saisie manuelle reste disponible.",
      disabled: "Désactivé",
      disabledDescription:
        "L’analyse IA est désactivée. Toute l’application reste utilisable manuellement.",
    },
    test: {
      successTitle: "Connexion réussie",
      failureTitle: "Test échoué",
      duration: " en {{duration}} s",
      detectedAmount: "Montant détecté sur le document de test :",
    },
    toasts: {
      saved: "Configuration IA enregistrée.",
      invalidUrl: "URL invalide : commencez par http:// ou https://.",
      defaultPromptUnavailable: "Le prompt par défaut est indisponible.",
      defaultPromptLoaded:
        "Prompt par défaut chargé. Enregistrez pour l’appliquer.",
      testSucceeded: "Test de connexion réussi.",
      testFailed: "Le test de connexion a échoué.",
    },
    validation: {
      url: "URL invalide : http:// ou https:// attendu.",
      model: "Le nom du modèle est obligatoire.",
      timeoutInteger: "Délai invalide.",
      timeoutMin: "Le délai doit être au moins de 5 secondes.",
      timeoutMax: "Le délai ne peut pas dépasser 600 secondes.",
      temperature: "Température attendue entre 0 et 2.",
      numCtxInteger: "Contexte invalide.",
      numCtxMin: "Le contexte doit être au moins de 1 024.",
      numCtxMax: "Le contexte ne peut pas dépasser 131 072.",
      maxPagesInteger: "Nombre de pages invalide.",
      maxPagesMin: "Au moins une page.",
      maxPagesMax: "20 pages maximum.",
      promptTooShort: "Le prompt d'extraction est trop court.",
    },
  },
  expenseStatement: {
    page: {
      eyebrow: "Générer · Note de frais",
      title: "Note de frais d’occupation",
      description:
        "Ajoutez les factures du mois, vérifiez les propositions de l’IA et laissez le backend calculer la quote-part. Le loyer est repris de la quittance active.",
      rentReceiptButton: "Quittance du mois",
      tabsAriaLabel: "Volets de génération",
      inputTab: "Saisie",
      previewTab: "Aperçu",
      removeDialog: {
        title: "Supprimer ce frais ?",
        message:
          "La ligne « {{item}} » sera retirée du brouillon. Cette action ne modifie pas les versions déjà générées.",
        confirm: "Supprimer",
      },
      regenerateDialog: {
        title: "Générer une nouvelle version ?",
        message:
          "Une note active existe déjà pour {{month}} (version {{version}}). La version {{next}} sera créée et l’ancienne restera consultable dans l’historique.",
        confirm: "Créer la nouvelle version",
      },
      loadingCompanies: "Chargement des sociétés…",
      noCompanyTitle: "Aucune société configurée",
      noCompanyDescription:
        "Créez une société dans la configuration pour générer une note de frais.",
      configureCompany: "Configurer une société",
      selectCompanyTitle: "Choisir une société",
      selectCompanyDescription:
        "Sélectionnez la société concernée pour saisir les frais de ce mois.",
      noLeaseTitle: "Aucun bail pour cette société",
      noLeaseDescription:
        "Ajoutez un bail société dans la page LMNP pour générer une note de frais.",
      selectLeaseTitle: "Choisir un bail",
      selectLeaseDescription:
        "Plusieurs baux sont liés à cette société. Sélectionnez le bail concerné pour saisir les frais de ce mois.",
      receivedReceipt: {
        title: "Quittance reçue détectée",
        description:
          "La quittance de {{month}} émise par {{landlord}} pour cette société ({{amount}}) sera reprise dans la note de frais.",
        download: "Télécharger la quittance",
      },
    },
    header: {
      companyLabel: "Société concernée",
      companyPlaceholder: "Choisir une société",
      leaseLabel: "Bail concerné",
      leasePlaceholder: "Choisir un bail",
      leaseChip: "Bail {{name}}",
      bannerTitle: "{{month}} — note version {{version}} déjà active",
      bannerText:
        "Total {{total}}. Générer à nouveau créera la version {{next}}.",
      open: "Ouvrir",
      completeVersion: "Version complète",
    },
    entry: {
      eyebrowEdit: "Modification",
      eyebrowAdd: "Ajouter un frais",
      titleEdit: "Modifier le frais",
      titleAdd: "Nouveau frais",
      monthLabel: "Mois concerné",
      submitEdit: "Enregistrer la modification",
      submitAdd: "Ajouter ce frais",
      cancelEdit: "Annuler la modification",
      hint: "Le formulaire se réinitialise après chaque ajout.",
    },
    fields: {
      type: "Type de frais",
      typeSuggestedAi: "Type suggéré par IA",
      supplierDetected: "Fournisseur détecté : {{supplier}}",
      typeHelp: "Les libellés proviennent de votre configuration.",
      selectPlaceholder: "Sélectionner…",
      alreadyAdded: " — déjà ajouté",
      proRata: "Prorata (%)",
      proRataHelp: "Champ libre : 35,71 ou 35,71 %.",
      amountInclVat: "Montant TTC",
      retainedEstimate: "Montant retenu estimé",
      retainedNote:
        "Estimation d’affichage : chaque ligne est recalculée avec arrondi au centime.",
      lowConfidence:
        "Confiance faible : vérifiez le montant avant d’ajouter le frais.",
    },
    lines: {
      eyebrow: "Liste",
      title: "Frais ajoutés",
      missing: "Il manque : {{types}}",
      count_one: "{{count}} ligne",
      count_other: "{{count}} lignes",
      emptyTitle: "Aucun frais pour {{month}}",
      emptyText:
        "Sélectionnez un poste ci-dessus, déposez un justificatif et ajoutez la ligne.",
      table: {
        type: "Type",
        supplier: "Fournisseur",
        amountInclVat: "Montant TTC",
        proRata: "Prorata",
        retained: "Montant retenu",
        actions: "Actions",
        calculating: "Calcul…",
        viewReceipt: "Voir le justificatif de {{item}}",
        edit: "Modifier {{item}}",
        remove: "Supprimer {{item}}",
      },
    },
    footer: {
      total: "Total retenu",
      inWords: "Soit {{words}}.",
      proRataBase: "Base de prorata :",
      referenceShare: "Quote-part de référence :",
      calculationNote:
        "Montants recalculés automatiquement à chaque modification.",
      calculationError: "Calcul indisponible : {{message}}",
      signature: "Signature",
      signatureHelp:
        "Signatures du PDG de la société active, apposées au bas de la note.",
      signatureBadge: "PNG / JPEG",
      noSignature: "Aucune signature",
      signaturesError:
        "Les signatures n’ont pas pu être chargées : {{message}}",
      missingCeoBefore:
        "Aucun PDG dans cette société. Ajoutez un salarié avec l’intitulé PDG dans la page",
      missingCeoAfter: ".",
      missingSignatureBefore:
        "Aucune signature pour le PDG. Ajoutez-en une dans sa fiche salarié, page",
      missingSignatureAfter: ".",
      companyLink: "Société",
      generate: "Générer la note de frais",
      hintNoLease: "Sélectionnez un bail pour saisir les frais.",
      hintNoLine: "Ajoutez au moins un frais pour générer la note.",
      hintNoSignature: "Configurez une signature pour générer la note.",
      hintStaleCalculation: "Mise à jour du calcul…",
      hintNextVersion:
        "Une version {{version}} existe : la version {{next}} sera créée.",
      hintSaved: "Le PDF définitif sera enregistré dans l’historique.",
    },
    preview: {
      invalidLines: "Corrigez les lignes en rouge pour actualiser l’aperçu.",
      noLine: "Ajoutez un frais pour voir l’aperçu de la note.",
      noSignature: "Configurez une signature pour afficher l’aperçu.",
      templateAria: "Modèle de la note de frais",
      builtInTemplate: "Modèle intégré",
      builtInTemplateName: "modèle intégré",
      withAttachments: "Avec annexes",
      note: "L’aperçu est rendu par le backend à partir des mêmes lignes que le total affiché. Il porte un filigrane et n’est jamais enregistré.",
    },
    result: {
      title: "Note de frais générée",
      meta: "{{month}} · version {{version}} · {{total}}",
      recorded:
        "Enregistrée avec le modèle « {{name}} » v{{version}} le {{date}}.",
      download: "Télécharger la note seule",
      downloadComplete: "Télécharger la note complète (ZIP)",
      open: "Ouvrir",
    },
    receipt: {
      label: "Fichier justificatif",
      limit: "10 Mo max.",
      uploading: "Envoi et préparation de l’analyse…",
      fallbackName: "Justificatif",
    },
    notice: {
      pending: "Recherche de la quittance du mois…",
      title: "Quittance de {{month}} (v{{version}}) :",
      hint: "Montant pré-rempli et verrouillé. La quittance sera annexée automatiquement.",
      openPdf: "Voir le PDF",
      modify: "Modifier",
      chooseReceipt: "Choisir la quittance",
      receiptOption: "v{{version}} · {{tenant}} / {{landlord}} · {{total}}",
      missingTitle: "Aucune quittance pour ce mois",
      missingText:
        "Générez la quittance : le montant du loyer sera repris et verrouillé.",
      generate: "Générer la quittance",
    },
    analysis: {
      starting: "Préparation de l’analyse…",
      running:
        "Analyse IA en cours — le modèle local peut prendre quelques secondes.",
      cancel: "Annuler l’analyse",
      done: "Analyse terminée — les champs ont été pré-remplis et le montant détecté remplace la valeur saisie.",
      doneWithDuration:
        "Analyse terminée en {{duration}} — les champs ont été pré-remplis et le montant détecté remplace la valeur saisie.",
      noResult:
        "Aucune information exploitable n’a été extraite. Complétez le frais manuellement.",
      excerpt: "« {{excerpt}} »",
      hint: "Les propositions de l’IA restent modifiables. Vérifiez-les avant d’ajouter le frais.",
      failureSuffix:
        "L’analyse est facultative : vous pouvez saisir le montant et le prorata manuellement.",
      cancelledSuffix: "La saisie manuelle reste disponible.",
      idleWithFile:
        "Analyse non lancée. Vous pouvez saisir le frais manuellement.",
      idleWithoutFile:
        "Déposez un justificatif : l’analyse IA démarrera automatiquement. Elle reste facultative.",
      startFailed: "L'analyse n'a pas pu démarrer.",
      failedFallback: "L'analyse a échoué. Saisissez le montant manuellement.",
      cancelled: "Analyse annulée.",
      timeout:
        "L'analyse prend trop de temps. Saisissez le montant manuellement.",
      unavailable: "Analyse indisponible, saisissez le montant.",
    },
    llm: {
      ready: "IA prête",
      remote: "IA distante",
      missingModel: "Modèle absent",
      unreachable: "IA injoignable",
      disabled: "IA désactivée",
      loading: "IA…",
      unavailable: "IA indisponible",
      unknown: "IA inconnue",
      messageFallback: "État de l’analyse IA indisponible.",
      configurationLink: "{{text}}. Ouvrir la configuration de l'IA.",
    },
    confidence: {
      haute: "Confiance élevée",
      moyenne: "Confiance moyenne",
      basse: "Confiance faible — vérifiez les valeurs",
    },
    dropzone: {
      text: "Glissez votre justificatif ici",
      hint: "ou cliquez pour parcourir vos fichiers",
      formats: "PDF, DOCX, XLSX, XLS, CSV, TXT, JPG, PNG",
      meta: "{{formats}} — {{max}} Mo max.",
      ariaLabel: "Choisir un fichier justificatif",
      tooLarge: "Fichier trop volumineux ({{max}} Mo maximum).",
      tooMany: "Un seul fichier à la fois.",
      unsupported: "Format non accepté. Formats : {{formats}}.",
      rejected: "Fichier refusé.",
      attached: "Justificatif joint",
      remove: "Retirer {{name}}",
    },
    toasts: {
      generated: "Note de {{month}} générée en version {{version}}.",
      fieldsPrefilled:
        "Des champs ont été pré-remplis par l’IA. Vérifiez-les avant d’ajouter le frais.",
      confirmAmount:
        "Confirmez le montant détecté par IA avant d’ajouter le frais.",
      added: "Frais ajouté.",
      updated: "Frais modifié.",
      removed: "Frais supprimé.",
      receiptNotSaved: "Le justificatif n’a pas pu être enregistré.",
      invalidLines: "Les lignes contiennent une valeur invalide.",
    },
    validation: {
      itemCode: "Sélectionnez un type de frais.",
      amount: "Saisissez un montant supérieur à 0 (ex. 80,50).",
      proRata: "Prorata attendu entre 0 et 100 (2 décimales max).",
      alreadyAdded:
        "Ce poste est déjà présent. Modifiez la ligne existante ou autorisez plusieurs lignes.",
      rentReceiptRequired:
        "Ajoutez d’abord la quittance du mois pour utiliser ce poste.",
      receiptRequired: "Le justificatif est obligatoire pour ce poste.",
    },
  },
};
