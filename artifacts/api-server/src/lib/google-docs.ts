/**
 * Google Docs/Drive integration for generating publication documents.
 * Uses the Replit connector proxy for OAuth token access.
 * Template doc: https://docs.google.com/document/d/1eHJGw4Lly5T8PRFqkcyVBdVZVwYgNUdZHRsjd8cwWUM/edit
 */

const TEMPLATE_DOC_ID = "1eHJGw4Lly5T8PRFqkcyVBdVZVwYgNUdZHRsjd8cwWUM";

// Uses the Google Drive connector (broader scopes: drive + docs)
const DRIVE_CONNECTOR_ID = "ccfg_google-drive_0F6D7EF5E22543468DB221F94F";
// Falls back to Google Docs connector if Drive not connected
const DOCS_CONNECTOR_ID = "ccfg_google-docs_587BECDAEBD441138D618E3ABD";

export interface DocData {
  serialNo: string;
  caseNo: string;
  applicationNo: string;
  classNo: string;
  title: string;
  journalNo: string;
}

async function fetchToken(connectorId: string): Promise<string | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const identity = process.env.REPL_IDENTITY;
  if (!hostname || !identity) return null;

  try {
    const res = await fetch(
      `https://${hostname}/api/v2/connection/${connectorId}`,
      { headers: { Authorization: `Bearer ${identity}` } }
    );
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    return (data.access_token as string) ?? null;
  } catch {
    return null;
  }
}

async function getOAuthToken(): Promise<string> {
  // Try Drive connector first (has drive + docs scopes), fall back to Docs connector
  const token = (await fetchToken(DRIVE_CONNECTOR_ID)) ?? (await fetchToken(DOCS_CONNECTOR_ID));
  if (!token) {
    throw new Error(
      "Google account not connected. Please connect Google Drive or Google Docs in the Replit Integrations panel."
    );
  }
  return token;
}

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
    throw new Error(`Failed to copy template doc (${res.status}): ${body}`);
  }
  const data = await res.json() as { id: string };
  return data.id;
}

async function replacePlaceholders(token: string, docId: string, data: DocData): Promise<void> {
  const replacements: Array<{ from: string; to: string }> = [
    { from: "{{S_NO}}",          to: data.serialNo },
    { from: "{{CASE_NO}}",       to: data.caseNo },
    { from: "{{APPLICATION_NO}}", to: data.applicationNo },
    { from: "{{CLASS}}",         to: data.classNo },
    { from: "{{TITLE}}",         to: data.title },
    { from: "{{JOURNAL_NO}}",    to: data.journalNo },
    { from: "{IMAGE}",           to: "" },
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
    throw new Error(`Failed to replace placeholders (${res.status}): ${body}`);
  }
}

/**
 * Copy the template Google Doc, fill in all placeholders, and return the URL.
 */
export async function generateDocument(data: DocData): Promise<string> {
  const token = await getOAuthToken();

  const docTitle = `TM-${data.journalNo}-${data.applicationNo} (${data.serialNo})`;
  const newDocId = await copyTemplate(token, docTitle);
  await replacePlaceholders(token, newDocId, data);

  return `https://docs.google.com/document/d/${newDocId}/edit`;
}

/** Returns true if a Google connector is reachable — used for health checks. */
export async function isGoogleConnected(): Promise<boolean> {
  const token = (await fetchToken(DRIVE_CONNECTOR_ID)) ?? (await fetchToken(DOCS_CONNECTOR_ID));
  return token !== null;
}
