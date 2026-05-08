/**
 * Filters CV extraction noise (names, sentences, job titles, PDF artifacts) from skill lists.
 * Keep web `isCleanSkill` (page.tsx) aligned when changing rules here.
 */

const STOP_PHRASES_EXACT = new Set(
  [
    'as a',
    'in',
    'and',
    'or',
    'the',
    'of',
    'to',
    'for',
    'with',
    'by',
    'an',
    'a',
    'on',
    'at',
    'is',
    'as',
    'ny',
    'us',
    'uk',
    'experience',
    'gaining',
    'when',
    'my',
    'this',
    'that',
    'from',
    'who',
    'whom',
    'into',
    'also',
    'but',
    'not',
    'all',
    'can',
    'has',
    'had',
    'were',
    'was',
    'been',
    'being',
    'have',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'such',
    'than',
    'then',
    'there',
    'their',
    'what',
    'which',
    'while',
    'where',
    'whose',
    'why',
    'how',
    'your',
    'our',
    'his',
    'her',
    'its',
    'they',
    'them',
    'these',
    'those',
    'some',
    'any',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'another',
    'same',
    'own',
    'only',
    'just',
    'even',
    'much',
    'many',
    'very',
    'too',
    'so',
    'no',
    'yes',
    'new',
    'old',
    'long',
    'high',
    'low',
    'large',
    'small',
    'good',
    'bad',
    'great',
    'best',
    'well',
    'here',
    'now',
    'today',
    'still',
    'yet',
    'already',
    'again',
    'once',
    'twice',
    'first',
    'last',
    'next',
    'previous',
    'following',
    'prior',
    'early',
    'late',
    'daily',
    'weekly',
    'monthly',
    'yearly',
  ].map((s) => s.toLowerCase())
);

/** Short uppercase tokens that are valid skills (avoid rejecting with two-letter state rule). */
const SHORT_UPPER_WHITELIST = new Set([
  'IV',
  'IM',
  'ECG',
  'EKG',
  'EMR',
  'EPIC',
  'HIPAA',
  'PICC',
  'CPR',
  'ACLS',
  'BLS',
  'PAL',
  'RN',
  'EMT',
  'ICU',
  'OR',
  'ED',
  'CT',
  'MRI',
  'PET',
  'PCI',
  'TAVR',
  'NG',
  'GI',
  'GU',
  'ENT',
  'ER',
  'US',
  'UK',
  'AI',
  'SQL',
  'AWS',
  'GCP',
  'API',
  'SDK',
  'UI',
  'UX',
  'QA',
  'HR',
  'IT',
]);

export function isAcceptableSkillLabel(raw: string): boolean {
  const line = raw.trim();
  if (!line) return false;
  if (line.length > 44) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;

  const lower = line.toLowerCase();

  if (STOP_PHRASES_EXACT.has(lower)) return false;
  if (words.length === 2 && STOP_PHRASES_EXACT.has(`${words[0].toLowerCase()} ${words[1].toLowerCase()}`)) return false;

  if (/page\s*\d+|^page\b|^break\b|^-{3,}|curriculum\s+vitae|^vitae$/i.test(line)) return false;
  if (/\(\s*\d{4,}\s*\)|\b\d{6,}\b/.test(line)) return false;
  if (/^dr\.?\s/i.test(line)) return false;

  if (/^(?:mr\.?|mrs\.?|ms\.?|miss)\s/i.test(line)) return false;

  if (/^(?:as a|in the|of the|and the|or the|to the|for the|with the|on the|at the)\s/i.test(line)) return false;
  if (/^(?:and|or|but)\s+[a-z]/i.test(line)) return false;

  if (
    /profoundly|impacted\s+my|my\s+understanding|managed\s+up\s+to|patients\s+daily|significantly\s+enhancing|explained\s+|presented\s+cases|offering\s+|compassionate\s+support|risks\s+and\s+benefits|cases\s+to\s+attending|enhancing\s+efficiency/i.test(
      line
    )
  )
    return false;

  if (
    /\b(?:medical\s+officer|clinical\s+extern|research\s+mentee|covid|consultant|collaborator|observer\/|extern\s*-|officer\/|curriculum|vitae)\b/i.test(
      line
    )
  )
    return false;

  if (/recommendations?|supervisor|supervised|working\s+under|ceo\s*&|founder|linkedin|github|portfolio|website:/i.test(line))
    return false;

  if (/\buniversity\b|\bcollege\s+of\b|\bbachelor\s+of\b|\bmaster\s+of\b/i.test(lower)) return false;

  if (/explained|presented|significantly|compassionate|gaining\s|understanding\s+of/i.test(line)) return false;

  if (/pmid|doi:|publication\s+status|peer\s+reviewed|journal\s+articles|abstracts?|hobbies\s*&|^\s*proficient\s*$/i.test(lower))
    return false;
  const commas = (line.match(/,/g) ?? []).length;
  if (commas >= 2) return false;
  if (commas >= 1 && words.length > 5) return false;

  if (
    /^I\s|during\s+my|while\s|selected\s+through|^managing\s|^patient\s+care|^assisted\s+with|^performed\s+data|^conducted\s|^during\s+|^managing\s+diverse/i.test(
      line
    )
  )
    return false;
  if (/epidemic|pandemic|under\s+review|submitted|joinpoint|join\s*point/i.test(lower)) return false;
  if (/\([12]\d{3}\)|^\d+\.\s*dengue/i.test(line)) return false;
  if (/^[A-Z][a-z]+\s+[A-Z]\.?\s*$/.test(line)) return false;
  if (/\s+&\s+[A-Z][a-z]{2,12}$/.test(line) && words.length <= 5) return false;

  if (
    /^(?:sargodha|karachi|lahore|islamabad|rawalpindi|nawaz|khan|raza|shahab|eijaz|saqib|munir|zia|ahad|faiz|hussain|fariha|abbasi|syed|khatri|zaveri|muzammil|moqattash|tabowei|dadzie|perswani|hirani|sugiura)$/i.test(
      lower
    ) &&
    words.length <= 3
  )
    return false;

  if (/[|;]/.test(line)) return false;

  if (/^[\d\s–\-/]+$/.test(line)) return false;

  if (/^\d{4}$/.test(line)) return false;

  if (/^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(line)) return false;

  if (/\.\s+[a-z]/i.test(line)) return false;

  if (/^[A-Z]{2}$/.test(line) && !SHORT_UPPER_WHITELIST.has(line)) return false;

  if (/^[a-z]+$/.test(line) && line.length <= 2) return false;

  if (/developer|engineer\s+at|manager\s+at|analyst\s+at/i.test(line)) return false;

  return /[a-z]/i.test(line);
}
