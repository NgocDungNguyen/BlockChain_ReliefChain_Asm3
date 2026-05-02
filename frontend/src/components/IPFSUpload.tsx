import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { uploadFileToPinata, cidToGatewayUrl, PinataUploadResult } from "../utils/pinata";
import styles from "../styles/IPFSUpload.module.css";

interface IPFSUploadProps {
  onUploadComplete: (result: PinataUploadResult) => void;
  disabled?: boolean;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function IPFSUpload({ onUploadComplete, disabled = false }: IPFSUploadProps) {
  const [status,     setStatus]     = useState<UploadStatus>("idle");
  const [errorMsg,   setErrorMsg]   = useState<string>("");
  const [result,     setResult]     = useState<PinataUploadResult | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [fileName,   setFileName]   = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf",
                          "video/mp4", "text/plain"];
  const MAX_SIZE_MB    = 50;

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type) && file.type !== "") {
      return `File type "${file.type}" not accepted. Upload JPG, PNG, PDF, MP4, or TXT.`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_SIZE_MB} MB limit.`;
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setStatus("error");
      setErrorMsg(validationError);
      return;
    }

    setStatus("uploading");
    setErrorMsg("");
    setFileName(file.name);
    setResult(null);

    try {
      const uploadResult = await uploadFileToPinata(file, file.name);
      setResult(uploadResult);
      setStatus("success");
      onUploadComplete(uploadResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setErrorMsg(msg);
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionLabel}>Evidence Upload (IPFS via Pinata)</h3>

      <div
        className={`${styles.dropZone} ${dragOver ? styles.dragActive : ""} ${disabled ? styles.disabledZone : ""}`}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload evidence file"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.pdf,.mp4,.txt"
          onChange={handleInputChange}
          style={{ display: "none" }}
          disabled={disabled}
        />

        {status === "uploading" ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinner} aria-label="Uploading..." />
            <p>Uploading {fileName} to IPFS...</p>
          </div>
        ) : status === "success" && result ? (
          <div className={styles.successState}>
            <span className={styles.checkmark}>✓</span>
            <p className={styles.successMsg}>Uploaded to IPFS</p>
            <p className={styles.cidDisplay}>CID: <code>{result.cid}</code></p>
            {result.success && (
              <a
                href={cidToGatewayUrl(result.cid)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.gatewayLink}
                onClick={(e) => e.stopPropagation()}
              >
                View on Pinata Gateway ↗
              </a>
            )}
          </div>
        ) : (
          <div className={styles.idleState}>
            <div className={styles.uploadIcon} aria-hidden="true">📎</div>
            <p className={styles.dropText}>
              {disabled
                ? "Connect wallet to upload"
                : "Drop evidence file here or click to browse"}
            </p>
            <p className={styles.acceptedFormats}>
              JPG, PNG, PDF, MP4, TXT — max {MAX_SIZE_MB} MB
            </p>
          </div>
        )}
      </div>

      {status === "error" && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorIcon}>⚠</span>
          {errorMsg}
          <button
            className={styles.retryBtn}
            onClick={() => { setStatus("idle"); setErrorMsg(""); setFileName(""); }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
