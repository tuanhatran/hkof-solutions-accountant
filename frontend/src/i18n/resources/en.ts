export const en = {
  common: {
    language: "Language",
    cancel: "Cancel",
    confirm: "Confirm",
    validate: "Save",
    close: "Close",
    closeNotification: "Close notification",
    retry: "Try again",
    loading: "Loading…",
    loadErrorTitle: "Unable to load data",
    ai: {
      detected: "Detected by AI",
      source: "Document excerpt: “{{source}}”",
    },
    amount: {
      confirmAria: "Confirm the AI-detected amount",
      confirmedAria: "Amount confirmed",
      confirmedText: "Amount confirmed.",
      hint: "AI-detected amount — confirm it to add the expense.",
    },
  },
  api: {
    errors: {
      VALIDATION_FAILED: "Some fields are invalid.",
      REQUEST_INVALID: "Invalid request.",
      INVALID_PARAMETER: "A request parameter is invalid.",
      MISSING_OR_INVALID_PARAMETER:
        "A request parameter is missing or invalid.",
      INVALID_BODY: "The request body is missing or malformed.",
      FILE_TOO_LARGE:
        "The file exceeds the maximum allowed size ({{maxJustificatif}} MB for a receipt, {{maxTemplate}} MB for a template).",
      INVALID_FILE:
        "The file could not be received. Check its format and size.",
      INTERNAL_ERROR: "An unexpected error occurred. Check the server logs.",
      NETWORK_ERROR:
        "The server is unreachable. Check that the HomeOfficeExpenses application is running.",
      HTTP_ERROR: "Error {{status}}: the request failed.",
      UNEXPECTED_ERROR: "An unexpected error occurred.",
    },
  },
  navigation: {
    ariaLabel: "Main navigation",
    mobileAriaLabel: "Mobile navigation",
    sections: {
      tracking: "Tracking",
      settings: "Settings",
    },
    links: {
      history: "History",
      company: "Company",
      lmnp: "LMNP",
      aiAdmin: "AI Admin",
    },
  },
  shell: {
    skipLink: "Skip to content",
    tagline: "Rent receipts & home-office expenses",
    localDataTitle: "Local data",
    localDataText:
      "No data leaves your machine as long as the LLM URL stays local.",
    footer: "HomeOfficeExpenses · personal use",
    draftDialog: {
      title: "Draft not generated",
      message:
        "Some entered information is not saved yet. Do you really want to leave this page? The draft is kept for the session, but the document will not be generated.",
      confirm: "Leave page",
      cancel: "Stay",
    },
  },
};
