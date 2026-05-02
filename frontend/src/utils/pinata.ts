import axios from "axios";

const PINATA_API_KEY    = import.meta.env.VITE_PINATA_API_KEY    as string;
const PINATA_API_SECRET = import.meta.env.VITE_PINATA_API_SECRET as string;

const PINATA_PIN_URL    = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_TEST_URL   = "https://api.pinata.cloud/data/testAuthentication";
const GATEWAY_URL       = "https://gateway.pinata.cloud/ipfs";

export type PinataUploadResult = {
  cid:     string;
  url:     string;
  size:    number;
  success: boolean;
};

/**
 * Verifies Pinata API credentials before upload.
 * Throws a descriptive error if authentication fails.
 */
export async function verifyPinataAuth(): Promise<void> {
  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    throw new Error(
      "Pinata API credentials missing. Add VITE_PINATA_API_KEY and VITE_PINATA_API_SECRET to frontend/.env"
    );
  }

  try {
    await axios.get(PINATA_TEST_URL, {
      headers: {
        pinata_api_key:        PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    });
  } catch {
    throw new Error(
      "Pinata authentication failed. Verify API key and secret at https://app.pinata.cloud/keys"
    );
  }
}

/**
 * Uploads a File object to IPFS via Pinata's HTTP pinning API.
 * Does not use @pinata/sdk to avoid node-gyp / FormData polyfill issues on Windows.
 *
 * @param file     Browser File object selected via <input type="file">.
 * @param name     Optional metadata name stored with the pin.
 * @returns        PinataUploadResult containing the IPFS CID and gateway URL.
 */
export async function uploadFileToPinata(
  file: File,
  name?: string
): Promise<PinataUploadResult> {
  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    // Fall back to returning a placeholder CID for demo without credentials
    console.warn(
      "Pinata credentials not set. Returning mock CID for development."
    );
    return {
      cid:     `QmMock${Date.now()}`,
      url:     `${GATEWAY_URL}/QmMock${Date.now()}`,
      size:    file.size,
      success: false,
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const metadata = JSON.stringify({
    name: name ?? file.name,
    keyvalues: {
      app:       "ReliefChain",
      timestamp: new Date().toISOString(),
    },
  });
  formData.append("pinataMetadata", metadata);

  const options = JSON.stringify({ cidVersion: 0 });
  formData.append("pinataOptions", options);

  try {
    const response = await axios.post<{
      IpfsHash: string;
      PinSize:  number;
    }>(PINATA_PIN_URL, formData, {
      headers: {
        pinata_api_key:        PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
        "Content-Type":        "multipart/form-data",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const cid = response.data.IpfsHash;
    return {
      cid,
      url:     `${GATEWAY_URL}/${cid}`,
      size:    response.data.PinSize,
      success: true,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const msg    = (err.response?.data as Record<string, string>)?.error ?? err.message;
      throw new Error(`Pinata upload failed (HTTP ${status}): ${msg}`);
    }
    throw new Error(`Pinata upload error: ${String(err)}`);
  }
}

/**
 * Returns a public Pinata gateway URL for any CID.
 */
export function cidToGatewayUrl(cid: string): string {
  return `${GATEWAY_URL}/${cid}`;
}

/**
 * Validates that a CID string matches a plausible CIDv0 or CIDv1 format.
 * Frontend validation only; IPFS network verifies content on retrieval.
 */
export function isValidCID(cid: string): boolean {
  if (!cid || typeof cid !== "string") return false;
  // CIDv0: starts with Qm, 46 chars
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) return true;
  // CIDv1: starts with b (base32), at least 10 chars
  if (/^b[a-z2-7]{10,}$/.test(cid)) return true;
  return false;
}
