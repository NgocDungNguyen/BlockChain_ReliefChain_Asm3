import axios from "axios";

const PINATA_JWT     = import.meta.env.VITE_PINATA_JWT as string;
const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_TEST_URL = "https://api.pinata.cloud/data/testAuthentication";
const GATEWAY_URL    = "https://gateway.pinata.cloud/ipfs";

export type PinataUploadResult = {
  cid:     string;
  url:     string;
  size:    number;
  success: boolean;
};

export async function verifyPinataAuth(): Promise<void> {
  if (!PINATA_JWT) {
    throw new Error(
      "Pinata JWT missing. Add VITE_PINATA_JWT to frontend/.env"
    );
  }
  try {
    await axios.get(PINATA_TEST_URL, {
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
    });
  } catch {
    throw new Error(
      "Pinata authentication failed. Verify VITE_PINATA_JWT at https://app.pinata.cloud/keys"
    );
  }
}

export async function uploadFileToPinata(
  file: File,
  name?: string
): Promise<PinataUploadResult> {
  if (!PINATA_JWT) {
    console.warn("Pinata JWT not set. Returning mock CID for development.");
    return {
      cid:     `QmMock${Date.now()}`,
      url:     `${GATEWAY_URL}/QmMock${Date.now()}`,
      size:    file.size,
      success: false,
    };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: name ?? file.name,
      keyvalues: { app: "ReliefChain", timestamp: new Date().toISOString() },
    })
  );
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

  try {
    const response = await axios.post<{ IpfsHash: string; PinSize: number }>(
      PINATA_PIN_URL,
      formData,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          "Content-Type": "multipart/form-data",
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
    const cid = response.data.IpfsHash;
    return { cid, url: `${GATEWAY_URL}/${cid}`, size: response.data.PinSize, success: true };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const msg    = (err.response?.data as Record<string, string>)?.error ?? err.message;
      throw new Error(`Pinata upload failed (HTTP ${status}): ${msg}`);
    }
    throw new Error(`Pinata upload error: ${String(err)}`);
  }
}

export function cidToGatewayUrl(cid: string): string {
  return `${GATEWAY_URL}/${cid}`;
}

export function isValidCID(cid: string): boolean {
  if (!cid || typeof cid !== "string") return false;
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) return true;
  if (/^b[a-z2-7]{10,}$/.test(cid)) return true;
  return false;
}
