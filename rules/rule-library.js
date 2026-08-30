(function (root, factory) {
  const library = factory();
  if (typeof module === "object" && module.exports) module.exports = library;
  root.StopLossRuleLibrary = library;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.0.0";

  const rows = [
    ["FIN-POLICY-TERM", "Policy term and coverage period", "Policy and Financial Structure", "Informational", "Informational", "policy (?:term|period)|effective date|expiration date|inception date"],
    ["FIN-SPECIFIC-ATTACHMENT", "Specific attachment point", "Policy and Financial Structure", "Increased Retained Risk", "High", "specific (?:deductible|attachment point)|annual specific deductible"],
    ["FIN-AGG-SPECIFIC", "Aggregating specific deductible", "Policy and Financial Structure", "Increased Retained Risk", "High", "aggregating specific|aggregate specific deductible|additional plan liability"],
    ["FIN-AGGREGATE", "Aggregate attachment point", "Policy and Financial Structure", "Financial Limitation", "High", "aggregate attachment point|aggregate deductible|minimum aggregate attachment"],
    ["FIN-BENEFIT-BASIS", "Contract or benefit basis", "Policy and Financial Structure", "Timing Risk", "High", "benefit basis|contract basis|(?:12|15|18|24|36|48|60|72)[/-](?:12|15|18|24|36)"],
    ["FIN-INCURRED", "Definition of incurred", "Policy and Financial Structure", "Timing Risk", "High", "incurred (?:means|when|date)|date (?:on|upon) which.*incurred"],
    ["FIN-PAID", "Definition of paid", "Policy and Financial Structure", "Timing Risk", "High", "paid (?:means|when|date)|deemed paid|payment instructions|check (?:is )?(?:issued|mailed|cleared)"],
    ["FIN-RUN-IN", "Run-in coverage", "Policy and Financial Structure", "Timing Risk", "Moderate", "run[- ]?in|incurred prior to.*effective|prior incurred"],
    ["FIN-RUN-OUT", "Run-out coverage", "Policy and Financial Structure", "Timing Risk", "High", "run[- ]?out|paid after.*termination|extended claim payment"],
    ["FIN-TERMINAL-LIABILITY", "Terminal liability", "Policy and Financial Structure", "Timing Risk", "High", "terminal liability|terminal extension|extended benefits after termination"],
    ["FIN-SPECIFIC-PERCENT", "Specific payable percentage", "Policy and Financial Structure", "Financial Limitation", "High", "specific (?:payable|reimbursement) percentage|specific coinsurance"],
    ["FIN-AGG-PERCENT", "Aggregate payable percentage", "Policy and Financial Structure", "Financial Limitation", "High", "aggregate (?:payable|reimbursement) percentage|aggregate coinsurance"],
    ["FIN-MAXIMUM", "Policy reimbursement maximum", "Policy and Financial Structure", "Financial Limitation", "Critical", "maximum (?:specific |aggregate )?(?:benefit|reimbursement|liability)|lifetime maximum|policy period maximum"],
    ["FIN-PREMIUM", "Premium rates and calculation", "Policy and Financial Structure", "Informational", "Informational", "premium rate|monthly premium|premium per covered|deposit premium"],
    ["FIN-GRACE", "Premium grace period", "Policy and Financial Structure", "Timing Risk", "High", "grace period|premium.*(?:due|delinquent|unpaid)"],
    ["FIN-COMMISSION", "Commission assumption", "Policy and Financial Structure", "Pricing/Reimbursement Limitation", "Moderate", "commission|broker compensation|producer compensation"],
    ["FIN-LASER", "Special risk limitation or laser", "Policy and Financial Structure", "Increased Retained Risk", "Critical", "laser|special risk limitation|alternate specific deductible|contingent specific"],
    ["FIN-RATE-CAP", "Renewal rate cap", "Policy and Financial Structure", "Favorable Provision", "Moderate", "renewal rate cap|rate cap|maximum renewal increase"],
    ["FIN-NO-NEW-LASER", "No-new-laser protection", "Policy and Financial Structure", "Favorable Provision", "Moderate", "no new (?:laser|special risk)|without new individual limitation"],
    ["FIN-PLAN-MIRROR", "Plan mirroring", "Policy and Financial Structure", "Favorable Provision", "Moderate", "plan mirroring|mirrors? the plan|eligible under the plan.*eligible expense"],

    ["ELIG-ACTIVE-WORK", "Actively-at-work requirement", "Eligibility and Continuation", "Eligibility Risk", "High", "actively at work|active work requirement|working the required number"],
    ["ELIG-CLASS", "Eligible employee classes", "Eligibility and Continuation", "Eligibility Risk", "Moderate", "eligible class|class of employee|eligibility class"],
    ["ELIG-DEPENDENT", "Dependent eligibility", "Eligibility and Continuation", "Eligibility Risk", "Moderate", "eligible dependent|dependent child|dependent spouse"],
    ["ELIG-DISABLED-DEPENDENT", "Disabled dependent continuation", "Eligibility and Continuation", "Eligibility Risk", "High", "disabled dependent|incapacitated dependent|dependent disability"],
    ["ELIG-LEAVE", "Leave of absence", "Eligibility and Continuation", "Eligibility Risk", "High", "leave of absence|family and medical leave|FMLA|military leave"],
    ["ELIG-COBRA", "COBRA continuation", "Eligibility and Continuation", "Eligibility Risk", "High", "COBRA|continuation coverage|qualified beneficiary"],
    ["ELIG-RETIREE", "Retiree coverage", "Eligibility and Continuation", "Eligibility Risk", "High", "retiree|retired employee"],
    ["ELIG-REHIRE", "Rehire treatment", "Eligibility and Continuation", "Eligibility Risk", "Moderate", "rehire|re-employ|reemploy"],
    ["ELIG-ACQUISITION", "Acquisitions and new groups", "Eligibility and Continuation", "Underwriting/Disclosure Risk", "High", "acquisition|merger|new unit|new subsidiary|new group"],
    ["ELIG-ELIGIBILITY-CHANGE", "Eligibility rule changes", "Eligibility and Continuation", "Underwriting/Disclosure Risk", "High", "change.*eligibility|eligibility.*change|material change.*eligible"],

    ["VEND-PLAN-AMENDMENT", "Plan amendment approval", "Plan Changes and Vendors", "Contract Interpretation Risk", "High", "plan (?:document )?(?:amendment|change).*?(?:approval|consent)|(?:approval|consent).*?plan (?:document )?(?:amendment|change)"],
    ["VEND-MATERIAL-CHANGE", "Material change condition", "Plan Changes and Vendors", "Underwriting/Disclosure Risk", "High", "material change|materially change|material modification"],
    ["VEND-TPA", "Third-party administrator", "Plan Changes and Vendors", "Administrative Requirement", "Moderate", "third[- ]party administrator|\bTPA\b|claim administrator"],
    ["VEND-PBM", "Pharmacy benefit manager", "Plan Changes and Vendors", "Administrative Requirement", "Moderate", "pharmacy benefit manager|\bPBM\b"],
    ["VEND-NETWORK", "Provider network", "Plan Changes and Vendors", "Pricing/Reimbursement Limitation", "Moderate", "provider network|\bPPO\b|network agreement|network vendor"],
    ["VEND-COST-CONTAINMENT", "Cost containment vendor", "Plan Changes and Vendors", "Administrative Requirement", "Moderate", "cost containment|bill review vendor|claim negotiation vendor"],
    ["VEND-RBP", "Reference-based pricing vendor", "Plan Changes and Vendors", "Pricing/Reimbursement Limitation", "High", "reference[- ]based pricing|\bRBP\b|reference pricing vendor"],
    ["VEND-DOCUMENT-DELIVERY", "Document delivery requirement", "Plan Changes and Vendors", "Administrative Requirement", "High", "deliver.*plan document|provide.*plan document|document delivery|within .* days.*document"],
    ["VEND-APPROVED-DOCUMENT", "Carrier-recognized plan document", "Plan Changes and Vendors", "Contract Interpretation Risk", "High", "approved plan document|plan document on file|accepted by (?:us|the company|carrier)"],
    ["VEND-DISCRETION", "Plan administrator discretion", "Plan Changes and Vendors", "Carrier Discretion", "High", "discretionary authority|sole discretion|abuse of discretion"],

    ["MED-MEDICAL-NECESSITY", "Medical necessity standard", "Medical and Clinical", "Carrier Discretion", "High", "medically necessary|medical necessity|necessary and appropriate"],
    ["MED-EXPERIMENTAL", "Experimental or investigational services", "Medical and Clinical", "Potential Coverage Gap", "High", "experimental|investigational|unproven|investigative treatment"],
    ["MED-OFF-LABEL", "Off-label use", "Medical and Clinical", "Potential Coverage Gap", "High", "off[- ]label|unlabeled use|FDA[- ]approved indication"],
    ["MED-GENE-CELL", "Gene and cell therapy", "Medical and Clinical", "Potential Coverage Gap", "Critical", "gene therapy|cell therapy|CAR[- ]?T|chimeric antigen|genetic therapy"],
    ["MED-SPECIALTY-DRUG", "Specialty pharmaceuticals", "Medical and Clinical", "Potential Coverage Gap", "High", "specialty (?:drug|pharmaceutical)|high[- ]cost drug|specialty medication"],
    ["MED-TRANSPLANT", "Transplant provisions", "Medical and Clinical", "Potential Coverage Gap", "High", "transplant|organ procurement|donor expense"],
    ["MED-CLINICAL-TRIAL", "Clinical trials", "Medical and Clinical", "Compliance Interaction", "High", "clinical trial|routine patient costs.*trial"],
    ["MED-PREAUTH", "Preauthorization requirement", "Medical and Clinical", "Administrative Requirement", "High", "preauthorization|pre-certification|precertification|prior authorization"],
    ["MED-PROVIDER-ERROR", "Provider error", "Medical and Clinical", "Potential Coverage Gap", "High", "provider error|medical error|never event|wrong-site"],
    ["MED-HAC", "Facility-acquired condition", "Medical and Clinical", "Potential Coverage Gap", "High", "hospital[- ]acquired|facility[- ]acquired|healthcare[- ]acquired condition"],
    ["MED-COSMETIC", "Cosmetic treatment exclusion", "Medical and Clinical", "Potential Coverage Gap", "Moderate", "cosmetic (?:surgery|procedure|treatment)|not medically necessary.*appearance"],
    ["MED-INFERTILITY", "Infertility and reproductive services", "Medical and Clinical", "Potential Coverage Gap", "Moderate", "infertility|in vitro|IVF|assisted reproductive"],
    ["MED-MENTAL-PARITY", "Mental health and substance use interaction", "Medical and Clinical", "Compliance Interaction", "High", "mental health|substance use disorder|MHPAEA|behavioral health"],
    ["MED-TELEHEALTH", "Telehealth", "Medical and Clinical", "Potential Coverage Gap", "Low", "telehealth|telemedicine|virtual visit"],

    ["PRICE-UC", "Usual and customary limitation", "Pricing and Reimbursement", "Pricing/Reimbursement Limitation", "High", "usual and customary|reasonable and customary|usual and reasonable"],
    ["PRICE-MAC", "Maximum allowable charge", "Pricing and Reimbursement", "Pricing/Reimbursement Limitation", "High", "maximum allowable charge|maximum allowable amount|allowable charge"],
    ["PRICE-MEDICARE", "Medicare-based reimbursement limitation", "Pricing and Reimbursement", "Pricing/Reimbursement Limitation", "Critical", "(?:percent|percentage|multiple|%|based on).*?Medicare|Medicare.*?(?:percent|percentage|multiple|%|fee schedule|benchmark)"],
    ["PRICE-RBP", "Reference-based pricing", "Pricing and Reimbursement", "Pricing/Reimbursement Limitation", "High", "reference[- ]based pricing|reference price|Medicare reference"],
    ["PRICE-NETWORK", "Network or PPO rate limitation", "Pricing and Reimbursement", "Pricing/Reimbursement Limitation", "High", "network rate|PPO rate|contracted rate|network discount"],
    ["PRICE-SETTLEMENT", "Provider settlement", "Pricing and Reimbursement", "Pricing/Reimbursement Limitation", "High", "provider settlement|settlement agreement|negotiated settlement"],
    ["PRICE-NEGOTIATION", "Negotiated claim payment", "Pricing and Reimbursement", "Administrative Requirement", "Moderate", "claim negotiation|negotiated amount|negotiation service"],
    ["PRICE-SAVINGS-FEE", "Percentage-of-savings fee", "Pricing and Reimbursement", "Financial Limitation", "High", "percentage of savings|percent of savings|savings fee|contingency fee"],
    ["PRICE-LOST-DISCOUNT", "Lost discount from untimely payment", "Pricing and Reimbursement", "Timing Risk", "High", "lost discount|loss of discount|untimely payment|late payment.*discount"],
    ["PRICE-BALANCE-BILL", "Balance-bill treatment", "Pricing and Reimbursement", "Financial Limitation", "High", "balance bill|balance billing|provider demand.*additional"],
    ["PRICE-AUDIT-REDUCTION", "Post-payment audit reduction", "Pricing and Reimbursement", "Pricing/Reimbursement Limitation", "Moderate", "post[- ]payment audit|retrospective audit|audit reduction"],

    ["FED-NSA", "No Surprises Act interaction", "Federal Payment Interactions", "Compliance Interaction", "High", "No Surprises Act|surprise billing|emergency services.*out[- ]of[- ]network"],
    ["FED-QPA", "Qualifying payment amount", "Federal Payment Interactions", "Compliance Interaction", "High", "qualifying payment amount|\bQPA\b"],
    ["FED-IDR", "Independent dispute resolution", "Federal Payment Interactions", "Compliance Interaction", "High", "independent dispute resolution|federal IDR|open negotiation period"],
    ["FED-RECOGNIZED-AMOUNT", "Recognized amount", "Federal Payment Interactions", "Compliance Interaction", "Moderate", "recognized amount|out[- ]of[- ]network rate"],
    ["FED-OON", "Out-of-network payment", "Federal Payment Interactions", "Pricing/Reimbursement Limitation", "High", "out[- ]of[- ]network (?:payment|rate|provider)|nonparticipating provider"],
    ["FED-APPEAL-LATE", "Appeal-driven late payment", "Federal Payment Interactions", "Timing Risk", "High", "appeal.*(?:late|delay|payment)|external review.*payment"],

    ["REC-MEDICARE-COB", "Medicare coordination", "Other Coverage and Recovery", "Compliance Interaction", "High", "Medicare.*?(?:primary|secondary|coordinate|eligible|entitled)|(?:primary|secondary).*?Medicare"],
    ["REC-COB", "Coordination of benefits", "Other Coverage and Recovery", "Financial Limitation", "High", "coordination of benefits|other plan.*primary|order of benefit determination"],
    ["REC-WORKERS-COMP", "Workers compensation", "Other Coverage and Recovery", "Potential Coverage Gap", "High", "workers'? compensation|work[- ]related injury|occupational injury"],
    ["REC-OTHER-INSURANCE", "Other insurance", "Other Coverage and Recovery", "Financial Limitation", "Moderate", "other insurance|other coverage|duplicate coverage"],
    ["REC-SUBROGATION", "Subrogation rights", "Other Coverage and Recovery", "Financial Limitation", "High", "subrogation|subrogate|third[- ]party recovery"],
    ["REC-REIMBURSEMENT", "Reimbursement and recovery", "Other Coverage and Recovery", "Financial Limitation", "High", "right of reimbursement|recovery from third party|reimburse.*recovery"],
    ["REC-RECOVERABLE", "Recoverable versus recovered amounts", "Other Coverage and Recovery", "Financial Limitation", "High", "recoverable|could have been recovered|amounts? recovered"],
    ["REC-OFFSET", "Third-party offset", "Other Coverage and Recovery", "Financial Limitation", "High", "offset.*third party|third[- ]party.*offset|deduct.*recovery"],
    ["REC-RESPONSIBLE-PARTY", "Responsible-party exclusion", "Other Coverage and Recovery", "Potential Coverage Gap", "Moderate", "responsible third party|legally liable party|liability of another"],

    ["UW-DISCLOSURE", "Underwriting disclosure duty", "Underwriting", "Underwriting/Disclosure Risk", "Critical", "disclosure|disclose|underwriting information|claim disclosure"],
    ["UW-KNOWN-CLAIM", "Known or potential claim", "Underwriting", "Underwriting/Disclosure Risk", "Critical", "known claim|potential claim|known or expected claim|large claimant"],
    ["UW-MISREP", "Misrepresentation", "Underwriting", "Underwriting/Disclosure Risk", "Critical", "misrepresentation|material representation|false statement"],
    ["UW-OMISSION", "Material omission", "Underwriting", "Underwriting/Disclosure Risk", "Critical", "material omission|failure to disclose|omitted information"],
    ["UW-RESCISSION", "Rescission", "Underwriting", "Underwriting/Disclosure Risk", "Critical", "rescission|rescind|void ab initio"],
    ["UW-LASER", "Underwriting laser", "Underwriting", "Increased Retained Risk", "Critical", "laser|special risk limitation|individual specific deductible"],
    ["UW-RENEWAL", "Renewal underwriting restriction", "Underwriting", "Underwriting/Disclosure Risk", "High", "renewal.*underwriting|underwriting.*renewal|renewal condition"],
    ["UW-CENSUS", "Census threshold", "Underwriting", "Underwriting/Disclosure Risk", "High", "census threshold|minimum enrollment|covered lives.*(?:increase|decrease)|enrollment change"],
    ["UW-MATERIAL-CLAIM", "Material claim change", "Underwriting", "Underwriting/Disclosure Risk", "High", "material change.*claim|claimant change|shock claim"],
    ["UW-APPLICATION", "Application incorporated into policy", "Underwriting", "Contract Interpretation Risk", "High", "application.*incorporated|application.*part of (?:this )?policy|statements in the application"],

    ["ADMIN-REPORTING", "High-dollar claim reporting", "Claims Administration", "Administrative Requirement", "High", "reporting threshold|high[- ]dollar reporting|claim.*exceed.*report|notify.*claimant"],
    ["ADMIN-NOTICE", "Claim notice deadline", "Claims Administration", "Timing Risk", "High", "notice of claim|claim notice|written notice.*days"],
    ["ADMIN-PROOF", "Proof-of-loss deadline", "Claims Administration", "Timing Risk", "Critical", "proof of loss|proof[- ]of[- ]loss|satisfactory proof"],
    ["ADMIN-FILING", "Claim filing deadline", "Claims Administration", "Timing Risk", "Critical", "filing deadline|submit.*claim.*days|claim must be filed"],
    ["ADMIN-AUDIT", "Audit rights", "Claims Administration", "Administrative Requirement", "Moderate", "audit|inspect.*records|examine.*books"],
    ["ADMIN-RECORDS", "Books and records", "Claims Administration", "Administrative Requirement", "Moderate", "books and records|maintain.*records|records retention"],
    ["ADMIN-OFFSET", "Carrier offset rights", "Claims Administration", "Financial Limitation", "High", "right to offset|may offset|setoff|set[- ]off"],
    ["ADMIN-OVERPAYMENT", "Overpayment recovery", "Claims Administration", "Financial Limitation", "High", "overpayment|overpaid|repay.*carrier|return.*reimbursement"],
    ["ADMIN-REIMBURSE-TIMING", "Reimbursement timing", "Claims Administration", "Timing Risk", "High", "reimburse.*within|reimbursement.*days|payment of reimbursement"],
    ["ADMIN-ADVANCE", "Advance funding", "Claims Administration", "Favorable Provision", "Moderate", "advance funding|advanced funding|expedited funding|accommodation reimbursement"],
    ["ADMIN-ADVANCE-CONDITION", "Advance-funding prerequisites", "Claims Administration", "Administrative Requirement", "High", "advance funding.*(?:condition|require|proof|repay|offset)|(?:condition|require|proof|repay|offset).*advance funding"],
    ["ADMIN-IRO", "External appeal or IRO", "Claims Administration", "Compliance Interaction", "High", "independent review organization|\bIRO\b|external review|external appeal"],
    ["ADMIN-CLAIM-DETERMINATION", "Carrier claim determination authority", "Claims Administration", "Carrier Discretion", "High", "we determine.*eligible|carrier.*determine.*claim|sole authority.*reimbursement"],
    ["ADMIN-LATE-PAYMENT", "Delayed payment consequences", "Claims Administration", "Timing Risk", "High", "late payment|delayed payment|timely payment|prompt payment"],

    ["ENF-ARBITRATION", "Arbitration", "Enforcement", "Dispute/Enforcement Provision", "High", "arbitration|arbitral|American Arbitration Association"],
    ["ENF-MEDIATION", "Mediation", "Enforcement", "Dispute/Enforcement Provision", "Moderate", "mediation|mediate.*dispute"],
    ["ENF-VENUE", "Venue or forum", "Enforcement", "Dispute/Enforcement Provision", "High", "exclusive venue|forum selection|venue shall|jurisdiction.*court"],
    ["ENF-GOV-LAW", "Governing law", "Enforcement", "Dispute/Enforcement Provision", "Moderate", "governing law|governed by the laws|choice of law"],
    ["ENF-LEGAL-LIMIT", "Legal-action limitation", "Enforcement", "Dispute/Enforcement Provision", "Critical", "legal action.*(?:year|month|day)|suit.*must be brought|limitation of action"],
    ["ENF-INDEMNITY", "Indemnification", "Enforcement", "Dispute/Enforcement Provision", "High", "indemnif|hold harmless|defend and indemnify"],
    ["ENF-ASSIGNMENT", "Assignment", "Enforcement", "Dispute/Enforcement Provision", "Moderate", "assignment|assign.*policy|rights may not be assigned"],
    ["ENF-AMENDMENT", "Policy amendment formalities", "Enforcement", "Contract Interpretation Risk", "High", "policy.*amend.*(?:writing|officer)|amendment.*signed|change.*policy.*writing"],
    ["ENF-TERMINATION", "Termination", "Enforcement", "Dispute/Enforcement Provision", "Critical", "termination of (?:this )?policy|policy terminates|terminate coverage"],
    ["ENF-RENEWAL", "Renewal", "Enforcement", "Dispute/Enforcement Provision", "High", "renewal|nonrenewal|non-renewal"],
    ["ENF-CONFLICT", "Policy controls conflicts", "Enforcement", "Contract Interpretation Risk", "High", "conflict.*(?:plan|policy)|(?:policy|schedule).*shall control|this policy.*prevail"],
    ["ENF-SCHEDULE-CONTROLS", "Schedule controls conflicts", "Enforcement", "Contract Interpretation Risk", "High", "schedule of insurance.*(?:control|prevail)|schedule.*conflict.*policy"],

    ["EXC-ILLEGAL-ACTS", "Illegal acts exclusion", "Exclusions", "Potential Coverage Gap", "High", "illegal act|criminal act|felony|misdemeanor|unlawful conduct"],
    ["EXC-CONTRACT-LIABILITY", "Contractually assumed liability", "Exclusions", "Potential Coverage Gap", "High", "liability assumed.*contract|contractually assumed liability"],
    ["EXC-NONCOMPLIANCE", "Plan noncompliance exclusion", "Exclusions", "Compliance Interaction", "High", "failure to comply|noncompliance.*plan|contrary to applicable law"],
    ["EXC-EX-GRATIA", "Ex gratia or discretionary payment", "Exclusions", "Potential Coverage Gap", "High", "ex gratia|gratuitous payment|voluntary payment|without legal obligation"],
    ["EXC-LATE-CLAIM", "Late claim exclusion", "Exclusions", "Timing Risk", "Critical", "untimely claim|late claim|not submitted timely"],
    ["EXC-FOREIGN", "Foreign treatment", "Exclusions", "Potential Coverage Gap", "Moderate", "treatment outside.*United States|foreign country|international treatment"],
    ["EXC-WAR", "War and terrorism", "Exclusions", "Potential Coverage Gap", "Moderate", "war|terrorism|act of war|armed conflict"],
    ["EXC-PANDEMIC", "Pandemic or epidemic", "Exclusions", "Potential Coverage Gap", "High", "pandemic|epidemic|communicable disease exclusion"],
    ["EXC-NONCOVERED-PROVIDER", "Provider-status limitation", "Exclusions", "Potential Coverage Gap", "High", "ineligible provider|excluded provider|noncovered provider"],
    ["EXC-SANCTIONS", "Sanctions and prohibited payment", "Exclusions", "Compliance Interaction", "Moderate", "economic sanctions|OFAC|prohibited payment"],

    ["FAV-MIRROR-DELETES", "Mirroring deletes base exclusions", "Favorable Provisions", "Favorable Provision", "Low", "(?:delete|remove).*exclusion|exclusions? (?:are|is) deleted"],
    ["FAV-ADVANCE", "Advance funding available", "Favorable Provisions", "Favorable Provision", "Low", "expedited advance funding|advance funding endorsement"],
    ["FAV-NO-LASER", "No-new-laser renewal protection", "Favorable Provisions", "Favorable Provision", "Low", "no new special risk limitation|no new laser"],
    ["FAV-UNLIMITED", "Unlimited reimbursement maximum", "Favorable Provisions", "Favorable Provision", "Low", "unlimited (?:lifetime|policy period|maximum).*reimbursement|maximum.*unlimited"],
    ["FAV-TERMINAL", "Terminal liability available", "Favorable Provisions", "Favorable Provision", "Low", "terminal liability (?:included|available)|terminal extension"],
    ["FAV-RATE-CAP", "Renewal rate protection", "Favorable Provisions", "Favorable Provision", "Low", "renewal rate cap endorsement|rate increase shall not exceed"],
    ["FAV-APPEAL-EXTENSION", "Appeal or IRO payment extension", "Favorable Provisions", "Favorable Provision", "Low", "extended benefit.*(?:appeal|IRO)|appeal.*extended benefit"],
    ["FAV-GAPLESS", "Gapless run-out", "Favorable Provisions", "Favorable Provision", "Low", "gapless|no gap.*run[- ]out|continuous run[- ]out"],
    ["FAV-WAIVER", "Carrier waiver of limitation", "Favorable Provisions", "Favorable Provision", "Low", "waive.*limitation|waiver.*exclusion|exception approved"],
    ["FAV-CONTINUITY", "Continuity protection", "Favorable Provisions", "Favorable Provision", "Low", "continuity of coverage|continuation protection|prior carrier credit"]
  ];

  const custom = {
    "FIN-SPECIFIC-ATTACHMENT": {
      whyItMatters: "This is the plan's retained risk per covered person before specific reimbursement begins.",
      reviewerQuestions: ["Is the amount uniform, class-specific, or claimant-specific?", "Does a proposal change it without changing the stated rate-cap protection?"],
      recommendedAction: "Verify every schedule, proposal, endorsement, and laser before drawing a retained-risk conclusion."
    },
    "FIN-RATE-CAP": {
      whyItMatters: "A rate cap may protect only named pricing variables and may contain conditions that alter or defeat the protection.",
      reviewerQuestions: ["Which variables are expressly capped?", "Is a specific attachment-point change listed only as a material-change condition?"],
      recommendedAction: "Quote the protected variables and conditions separately. Do not describe all economics as capped."
    },
    "FIN-PLAN-MIRROR": {
      whyItMatters: "Mirroring may narrow reimbursement gaps but often depends on timely document delivery, unchanged plan terms, and stated withdrawal conditions.",
      reviewerQuestions: ["Which exclusions are deleted or modified?", "What permits the carrier to withdraw mirroring?"],
      recommendedAction: "Link each modifying clause to the affected base provision and preserve the superseded language as history."
    },
    "REC-MEDICARE-COB": {
      whyItMatters: "Eligibility, entitlement, enrollment, and Medicare Secondary Payer status are distinct concepts.",
      recommendedAction: "Do not treat Medicare eligibility as equivalent to entitlement without supporting language."
    },
    "REC-RECOVERABLE": {
      whyItMatters: "A carrier may offset amounts it believes could have been recovered even if the plan never actually recovered them.",
      recommendedAction: "Distinguish recoverable amounts from amounts actually recovered."
    },
    "ADMIN-ADVANCE": {
      whyItMatters: "Advance funding can improve cash flow while prerequisites, last-period restrictions, repayment duties, and offsets can narrow its practical value.",
      recommendedAction: "Extract the feature and every prerequisite as separate linked provisions."
    },
    "ENF-SCHEDULE-CONTROLS": {
      hierarchyBehavior: "schedule_controls",
      recommendedAction: "Give controlling schedule terms priority while retaining conflicting base-policy text as superseded or subordinate."
    },
    "FAV-MIRROR-DELETES": {
      hierarchyBehavior: "delete_target",
      recommendedAction: "Mark the targeted base exclusion superseded only when the modifying relationship is supported by the text."
    }
  };

  function makeRule(row) {
    const [id, title, category, classification, severity, pattern] = row;
    const overrides = custom[id] || {};
    return Object.assign({
      id,
      version: VERSION,
      title,
      category,
      issueClassification: classification,
      defaultSeverity: severity,
      detection: { patterns: [pattern], flags: "gi", contextWindow: 900 },
      contextRequirements: [],
      positiveIndicators: [pattern],
      negativeIndicators: [],
      forbiddenContexts: ["table of contents only"],
      hierarchyBehavior: "preserve_and_link",
      comparisonBehavior: "concept_pair",
      missingConceptBehavior: "not_located_not_gap",
      analysis: `The document contains operative language concerning ${title.toLowerCase()}. The reviewer should evaluate the complete clause, related definitions, schedules, and endorsements before reaching a conclusion.`,
      whyItMatters: `${title} can affect reimbursement, retained risk, administration, or contract interpretation depending on the controlling language and review mode.`,
      reviewerQuestions: ["Is this language current and controlling?", "Does another document modify, narrow, or supersede it?"],
      recommendedAction: "Review the full clause in context and confirm its relationship to the plan, proposal, schedule, and endorsements.",
      negotiationPoint: "Request written clarification if the operative effect is ambiguous or materially changes expected risk transfer.",
      regression: { positive: [], negative: [] },
      ambiguityNotes: "Detection is a review lead, not a legal conclusion."
    }, overrides);
  }

  const rules = rows.map(makeRule);
  return Object.freeze({ version: VERSION, rules: Object.freeze(rules) });
});
