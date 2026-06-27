/**
 * Google Docs/Drive integration via Service Account JSON key.
 * Template doc: https://docs.google.com/document/d/1eHJGw4Lly5T8PRFqkcyVBdVZVwYgNUdZHRsjd8cwWUM/edit
 *
 * Required env var: GOOGLE_SERVICE_ACCOUNT_JSON
 *   Value: the full JSON content of a Google Service Account key file.
 *   The service account must have Editor access to the template doc.
 *
 * Scopes used:
 *   https://www.googleapis.com/auth/drive
 *   https://www.googleapis.com/auth/documents
 */

const TEMPLATE_DOC_ID = "1eHJGw4Lly5T8PRFqkcyVBdVZVwYgNUdZHRsjd8cwWUM";
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
];

export interface DocData {
  serialNo: string;
  caseNo: string;
  applicationNo: string;
  classNo: string;
  title: string;
  journalNo: string;
}

// ---------- JWT / token helpers ----------

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function parseServiceAccountKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set. " +
      "Paste your Google Service Account JSON key as a secret named GOOGLE_SERVICE_ACCOUNT_JSON."
    );
  }
  try {
    return JSON.parse(raw) as ServiceAccountKey;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the entire contents of the service account key file.");
  }
}

/** Convert a PEM private key + header/claims into a JWT. */
async function makeJwt(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope: SCOPES.join(" "),
    aud: key.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const header = { alg: "RS256", typ: "JWT" };
  const toB64 = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

  const signingInput = `${toB64(header)}.${toB64(claims)}`;

  // Import the PEM private key
  const pemBody = key.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const keyBytes = Buffer.from(pemBody, "base64");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(signingInput)
  );

  return `${signingInput}.${Buffer.from(sig).toString("base64url")}`;
}

let _cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_cachedToken && _cachedToken.exp > Date.now() / 1000 + 60) {
    return _cachedToken.token;
  }

  const key = parseServiceAccountKey();
  const jwt = await makeJwt(key);
  const tokenUri = key.token_uri ?? "https://oauth2.googleapis.com/token";

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get access token (${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  _cachedToken = {
    token: data.access_token,
    exp: Math.floor(Date.now() / 1000) + data.expires_in,
  };
  return _cachedToken.token;
}

// ---------- Google API calls ----------

async function copyTemplate(token: string, docTitle: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${TEMPLATE_DOC_ID}/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: docTitle }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Failed to copy template doc (${res.status}): ${body}. ` +
      `Make sure the service account (${parseServiceAccountKey().client_email}) has Editor access to the template doc.`
    );
  }
  const data = await res.json() as { id: string };
  return data.id;
}

async function replacePlaceholders(token: string, docId: string, data: DocData): Promise<void> {
  const replacements: Array<{ from: string; to: string }> = [
    { from: "{{S_NO}}",           to: data.serialNo },
    { from: "{{CASE_NO}}",        to: data.caseNo },
    { from: "{{APPLICATION_NO}}", to: data.applicationNo },
    { from: "{{CLASS}}",          to: data.classNo },
    { from: "{{TITLE}}",          to: data.title },
    { from: "{{JOURNAL_NO}}",     to: data.journalNo },
    { from: "{IMAGE}",            to: "" },
  ];

  const requests = replacements.map(r => ({
    replaceAllText: {
      containsText: { text: r.from, matchCase: true },
      replaceText: r.to,
    },
  }));

  const res = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fill placeholders (${res.status}): ${body}`);
  }
}

// ---------- Public API ----------

/**
 * Copy the template Google Doc, fill all placeholders, return the edit URL.
 */
export async function generateDocument(data: DocData): Promise<string> {
  const token = await getAccessToken();
  const docTitle = `TM-${data.journalNo}-${data.applicationNo} (${data.serialNo})`;
  const newDocId = await copyTemplate(token, docTitle);
  await replacePlaceholders(token, newDocId, data);
  return `https://docs.google.com/document/d/${newDocId}/edit`;
}

/** Returns true if the service account JSON key is present. */
export async function isGoogleConnected(): Promise<boolean> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return false;
  try {
    parseServiceAccountKey();
    return true;
  } catch {
    return false;
  }
}
