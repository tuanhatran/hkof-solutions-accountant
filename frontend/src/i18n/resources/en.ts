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
      METHOD_NOT_ALLOWED: "This action is not allowed for this address.",
      UNSUPPORTED_MEDIA_TYPE: "The request format is not supported.",
      NOT_ACCEPTABLE: "The requested response format is not available.",
      INTERNAL_ERROR: "An unexpected error occurred. Check the server logs.",
      NETWORK_ERROR:
        "The server is unreachable. Check that the HomeOfficeExpenses application is running.",
      HTTP_ERROR: "Error {{status}}: the request failed.",
      UNEXPECTED_ERROR: "An unexpected error occurred.",
      ADDRESS_REQUIRED: "The property address is required.",
      AMOUNT_REQUIRED: "The amount is required.",
      AMOUNT_INVALID: "The amount is invalid.",
      AMOUNT_MUST_BE_STRICTLY_POSITIVE: "The amount must be strictly positive.",
      AMOUNT_MUST_BE_POSITIVE_OR_ZERO: "The amount must be positive or zero.",
      AMOUNT_NEGATIVE: "The tax-inclusive amount cannot be negative.",
      AMOUNT_PRO_RATA_REQUIRED:
        "The monthly amount and the pro rata are required.",
      PRO_RATA_REQUIRED: "The pro rata is required.",
      PRO_RATA_INVALID: "The pro rata is not a valid percentage.",
      PRO_RATA_TOO_MANY_DECIMALS: "The pro rata accepts at most two decimals.",
      PRO_RATA_OUT_OF_RANGE: "The pro rata must be between 0 and 100%.",
      PRO_RATA_BUSINESS_AREA_OUT_OF_RANGE:
        "The business area must be between 0 and the total area.",
      DATE_INVALID: "The date is invalid.",
      MONTH_REQUIRED: "The month is required (YYYY-MM format).",
      MONTH_INVALID: "The month must use the YYYY-MM format.",
      VAT_NET_AMOUNT_REQUIRED: "The tax-exclusive amount is required.",
      VAT_NET_AMOUNT_NEGATIVE: "The tax-exclusive amount cannot be negative.",
      VAT_RATE_REQUIRED: "The VAT rate is required.",
      VAT_RATE_OUT_OF_RANGE: "The VAT rate must be between 0 and 100%.",
      COMPANY_REQUIRED: "Select a company.",
      COMPANY_NOT_FOUND: "Company not found.",
      COMPANY_NAME_REQUIRED: "The company name is required.",
      COMPANY_SIREN_DUPLICATE: "A company with this SIREN already exists.",
      COMPANY_IN_USE: "This company is used by data and cannot be deleted.",
      COMPANY_ACTIVE_LEASE_TENANT:
        "This company is the tenant of an active lease and cannot be deleted.",
      LEASE_NOT_FOUND: "Lease not found.",
      LEASE_ALREADY_LINKED: "This lease is already linked to another company.",
      LEASE_COMPANY_LEASE_LOCKED:
        "This lease is linked to a company and cannot be modified.",
      LEASE_PARTIES_REQUIRED: "Select a landlord and a tenant.",
      LEASE_SINGLE_TENANT_REQUIRED: "Select a single tenant.",
      LEASE_ACTIVE_NOT_FOUND: "No active lease is configured.",
      LEASE_NOT_IN_COMPANY: "This lease does not belong to the company.",
      LEASE_LANDLORD_REQUIRED: "Select a landlord.",
      LEASE_COMPANY_TENANT_INVALID:
        "The tenant company cannot be the lease company.",
      LEASE_TENANT_COMPANY_REQUIRED: "Select the tenant company.",
      LEASE_ALREADY_EXISTS:
        "An active lease already exists for this landlord and tenant.",
      LEASE_TENANT_REQUIRED: "Select a tenant.",
      LEASE_PARTIES_IDENTICAL:
        "The landlord and the tenant cannot be identical.",
      LEASE_COMPANY_ALREADY_LINKED:
        "This company is already linked to an active lease.",
      LEASE_SURFACES_REQUIRED: "Surfaces are required for a company lease.",
      LEASE_EMPLOYEE_PARTY: "An employee cannot be a party to a lease.",
      PERSON_REQUIRED: "Select a person.",
      PERSON_NOT_FOUND: "Person not found.",
      PERSON_HAS_SIGNATURES:
        "This person holds signatures and cannot be deleted.",
      PERSON_IN_USE: "This person is used by data and cannot be deleted.",
      PERSON_NAME_REQUIRED: "The person name is required.",
      EMPLOYEE_HAS_SIGNATURES:
        "This employee holds signatures and cannot be deleted.",
      EMPLOYEE_NOT_FOUND: "Employee not found.",
      EMPLOYEE_FIRST_NAME_REQUIRED: "The employee first name is required.",
      EMPLOYEE_LAST_NAME_REQUIRED: "The employee last name is required.",
      EMPLOYEE_EMAIL_INVALID: "The employee email address is invalid.",
      EMPLOYEE_EMAIL_DUPLICATE:
        "An employee with this email address already exists in the company.",
      EMPLOYEE_TITLE_REQUIRED: "The employee title is required.",
      EMPLOYEE_TITLE_INVALID: "Invalid employee title: {{title}}",
      EXPENSE_ITEM_UNKNOWN_CODE: "Unknown expense type: {{code}}",
      EXPENSE_ITEM_NOT_FOUND: "Expense item not found.",
      EXPENSE_ITEM_LABEL_REQUIRED: "The item label is required.",
      EXPENSE_ITEM_CODE_DUPLICATE:
        "An item with the code “{{code}}” already exists.",
      EXPENSE_ITEM_PERIODICITY_INVALID: "Invalid periodicity: {{periodicity}}",
      EXPENSE_ITEM_CODE_INVALID: "The item code is invalid.",
      EXPENSE_ITEM_REQUIRED: "The expense type is required.",
      EXPENSE_ITEM_SINGLE_USE:
        "The item “{{label}}” is single-use and cannot be added.",
      STATEMENT_AMOUNT_SOURCE_INVALID: "Invalid amount source: {{source}}",
      STATEMENT_AI_CONFIDENCE_INVALID:
        "Invalid AI confidence level: {{confidence}}",
      STATEMENT_LINES_REQUIRED:
        "Add at least one line to the expense statement.",
      STATEMENT_NOT_FOUND: "Expense statement not found.",
      RECEIPT_NOT_FOUND: "Receipt not found.",
      RECEIPT_IN_USE:
        "This receipt is used by an expense statement and cannot be deleted.",
      RENT_RECEIPT_NOT_FOUND: "Rent receipt not found.",
      RENT_RECEIPT_PDF_NOT_FOUND: "The PDF of this rent receipt was not found.",
      RENT_RECEIPT_TEMPLATE_INVALID:
        "The selected template is not a rent receipt template.",
      RENT_RECEIPT_PERIOD_INVALID: "The period end cannot precede the start.",
      SIGNATURE_MISSING:
        "No signature configured. Add a signature to the landlord on the LMNP page.",
      SIGNATURE_NAME_REQUIRED: "The signature name is required.",
      SIGNATURE_NAME_TOO_LONG:
        "The signature name is too long (255 characters maximum).",
      SIGNATURE_FILE_REQUIRED: "The signature file is required.",
      SIGNATURE_FILE_UNREADABLE: "The signature file cannot be read.",
      SIGNATURE_NOT_OWNED:
        "The selected signature does not belong to this person.",
      SIGNATURE_COMPANY_REQUIRED: "The signature company is required.",
      SIGNATURE_NOT_CEO:
        "The selected signature does not belong to this company's manager.",
      SIGNATURE_NOT_FOUND: "Signature not found.",
      FILE_NOT_FOUND: "File not found.",
      FILE_ACCESS_DENIED: "File access denied.",
      RECEIPT_FILE_REQUIRED: "The receipt file is required.",
      RECEIPT_EMPTY: "The receipt file is empty.",
      RECEIPT_TOO_LARGE: "The receipt file is too large (10 MB maximum).",
      RECEIPT_UNSUPPORTED_FORMAT:
        "Unsupported receipt format. Allowed formats: PDF, DOCX, XLSX/XLS, CSV, TXT, JPG, PNG.",
      RECEIPT_CONTENT_MISMATCH:
        "The file content does not match its extension (“.{{extension}}”).",
      SIGNATURE_EMPTY: "The signature image is empty.",
      SIGNATURE_TOO_LARGE: "The signature image is too large (2 MB maximum).",
      SIGNATURE_UNSUPPORTED_FORMAT:
        "The signature must be a PNG or JPEG image.",
      TEMPLATE_EMPTY: "The template file is empty.",
      TEMPLATE_TOO_LARGE: "The template file is too large (5 MB maximum).",
      TEMPLATE_EXTENSION_INVALID: "The template must be an HTML file (.html).",
      TEMPLATE_NOT_TEXT: "The HTML template must be a UTF-8 text file.",
      TEMPLATE_ACTIVE_NOT_FOUND:
        "No active template is configured for {{type}}.",
      TEMPLATE_NOT_FOUND: "Template not found.",
      TEMPLATE_RENDER_FAILED: "The template “{{name}}” could not be rendered.",
      TEMPLATE_NAME_REQUIRED: "The template name is required.",
      TEMPLATE_FILE_UNREADABLE: "The template file could not be read.",
      TEMPLATE_BUILT_IN_NOT_DELETABLE:
        "The built-in template cannot be deleted.",
      TEMPLATE_ACTIVE_NOT_DELETABLE:
        "The active template cannot be deleted. Activate another template first.",
      TEMPLATE_BUILT_IN_NOT_FOUND: "Built-in template not found.",
      DOCUMENT_UNSUPPORTED_FORMAT:
        "This document format is not supported for analysis.",
      DOCUMENT_UNREADABLE: "The document could not be read.",
      DOCUMENT_NO_TEXT:
        "Unreadable document: no usable text was found. Enter the amount manually.",
      DOCUMENT_NO_TEXT_NO_VISION:
        "The document has no usable text and the configured model does not support images. Choose a vision model or enter the amount manually.",
      ANALYSIS_NOT_FOUND: "Analysis not found.",
      ANALYSIS_ALREADY_FINISHED: "This analysis is already finished.",
      LLM_CONFIG_NOT_FOUND: "LLM configuration not found.",
      LLM_PROVIDER_UNKNOWN: "Unknown LLM provider.",
      LLM_PROVIDER_UNSUPPORTED: "Only Ollama is supported for now.",
      LLM_TIMEOUT_OUT_OF_RANGE:
        "The timeout must be between 5 and 600 seconds.",
      LLM_TEMPERATURE_INVALID:
        "The temperature must be a number between 0 and 2.",
      LLM_TEMPERATURE_OUT_OF_RANGE: "The temperature must be between 0 and 2.",
      LLM_CONTEXT_OUT_OF_RANGE:
        "The context size must be between 1,024 and 131,072.",
      LLM_MAX_PAGES_OUT_OF_RANGE:
        "The maximum number of pages must be between 1 and 20.",
      LLM_PROMPT_REQUIRED: "The extraction prompt cannot be empty.",
      LLM_URL_REQUIRED: "The LLM service URL is required.",
      LLM_URL_INVALID: "The LLM service URL is invalid.",
      LLM_URL_SCHEME_INVALID:
        "The LLM service URL must start with http:// or https://.",
      LLM_MODEL_REQUIRED:
        "No LLM model is configured. Set one in Admin or enter the amount manually.",
      LLM_EMPTY_RESPONSE: "The LLM model returned no usable content.",
      LLM_URL_NOT_CONFIGURED: "The LLM service URL is not configured.",
      LLM_HTTP_ERROR: "The LLM service responded with status {{status}}.",
      LLM_UNREACHABLE:
        "The LLM service is unreachable. Check that Ollama is running, or enter the amount manually.",
      LLM_RESPONSE_INVALID_JSON:
        "The model response is not valid JSON. You can still enter the amount manually.",
      LLM_RESPONSE_NOT_OBJECT:
        "The model response is not a compliant JSON object. You can still enter the amount manually.",
      LLM_RESPONSE_FIELD_NOT_ALLOWED:
        "The model response contains a disallowed field (“{{field}}”). You can still enter the amount manually.",
      LLM_RESPONSE_FIELD_MISSING:
        "The model response does not match the expected schema (missing field “{{field}}”).",
      LLM_RESPONSE_FIELD_INVALID:
        "The model response does not match the expected schema (field “{{field}}”).",
      LLM_RESPONSE_NO_JSON:
        "The model response does not contain a JSON object. You can still enter the amount manually.",
      STATEMENT_PDF_NOT_FOUND: "The requested PDF could not be found.",
      STATEMENT_SIGNATURE_MISSING:
        "No signature is configured for the manager. Add a signature to the manager employee on the LMNP page.",
      STATEMENT_TEMPLATE_INVALID:
        "The selected template is not an expense statement template.",
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
