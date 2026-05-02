import { ethers } from "ethers";

/**
 * Gas buffer multiplier: 20% above estimate to prevent out-of-gas reverts.
 */
const GAS_BUFFER = 120; // percent

/**
 * Estimates gas for a contract call and returns the buffered limit.
 * Returns a fixed fallback if estimation fails.
 *
 * @param contract   Ethers.js Contract instance with a connected signer.
 * @param method     Name of the contract function.
 * @param args       Array of arguments to pass to the function.
 * @param overrides  Optional ethers CallOverrides (e.g. { value }).
 * @returns          BigNumber gas limit with 20% buffer applied.
 */
export async function estimateGasWithBuffer(
  contract:  ethers.Contract,
  method:    string,
  args:      unknown[],
  overrides: ethers.PayableOverrides = {}
): Promise<ethers.BigNumber> {
  try {
    const estimated: ethers.BigNumber = await contract.estimateGas[method](
      ...args,
      overrides
    );
    // Apply buffer: estimated * 120 / 100
    return estimated.mul(GAS_BUFFER).div(100);
  } catch (err: unknown) {
    // If estimation itself reverts, parse the reason and re-throw
    const reason = await parseRevertReason(err);
    throw new Error(reason ?? "Gas estimation failed — transaction would revert.");
  }
}

/**
 * Checks whether the connected wallet has enough ETH to cover value + gas.
 * Throws a descriptive error if balance is insufficient.
 *
 * @param provider  Web3Provider with a connected signer.
 * @param address   Wallet address to check.
 * @param value     ETH value being sent (in wei).
 * @param gasLimit  Estimated gas limit.
 * @param gasPrice  Current gas price (fetched if not provided).
 */
export async function checkSufficientBalance(
  provider: ethers.providers.Web3Provider,
  address:  string,
  value:    ethers.BigNumber,
  gasLimit: ethers.BigNumber,
  gasPrice?: ethers.BigNumber
): Promise<void> {
  const balance    = await provider.getBalance(address);
  const price      = gasPrice ?? (await provider.getGasPrice());
  const gasCost    = gasLimit.mul(price);
  const totalCost  = value.add(gasCost);

  if (balance.lt(totalCost)) {
    const need = ethers.utils.formatEther(totalCost);
    const have = ethers.utils.formatEther(balance);
    throw new Error(
      `Insufficient balance. Required: ${need} ETH. Available: ${have} ETH.`
    );
  }
}

/**
 * Parses a revert reason from an ethers.js error object.
 *
 * Strategy:
 *  1. Check error.reason (already decoded by ethers).
 *  2. Check error.data for ABI-decoded custom errors.
 *  3. Fall back to eth_call simulation to extract revert data directly.
 *  4. Return a human-readable string in all cases.
 *
 * @param err  The thrown error from a failed contract call.
 * @returns    Human-readable revert reason or generic fallback.
 */
export async function parseRevertReason(err: unknown): Promise<string> {
  if (!err || typeof err !== "object") {
    return "Unknown error.";
  }

  const e = err as Record<string, unknown>;

  // Ethers v5 already decodes standard revert strings into .reason
  if (typeof e.reason === "string" && e.reason.length > 0) {
    return `Reverted: ${e.reason}`;
  }

  // Some providers embed the reason inside .error.message
  if (e.error && typeof (e.error as Record<string, unknown>).message === "string") {
    return `Reverted: ${(e.error as Record<string, unknown>).message}`;
  }

  // Attempt to decode hex revert data
  if (typeof e.data === "string" && e.data.startsWith("0x")) {
    const decoded = decodeRevertData(e.data as string);
    if (decoded) return `Reverted: ${decoded}`;
  }

  // Check nested data
  if (
    e.error &&
    typeof (e.error as Record<string, unknown>).data === "string"
  ) {
    const nestedData = (e.error as Record<string, unknown>).data as string;
    const decoded = decodeRevertData(nestedData);
    if (decoded) return `Reverted: ${decoded}`;
  }

  // Generic message fallback
  if (typeof e.message === "string") {
    // Strip unhelpful boilerplate from ethers
    const cleaned = (e.message as string)
      .replace("VM Exception while processing transaction: revert ", "")
      .replace("execution reverted: ", "")
      .trim();
    if (cleaned.length > 0) return cleaned;
  }

  return "Transaction reverted without a reason string.";
}

/**
 * Decodes ABI-encoded revert data.
 *  - Standard Error(string): selector 0x08c379a0
 *  - Standard Panic(uint256): selector 0x4e487b71
 *
 * @param data  Hex-encoded revert data.
 * @returns     Decoded string, or null if not decodable.
 */
function decodeRevertData(data: string): string | null {
  try {
    // Standard revert string: Error(string)
    if (data.startsWith("0x08c379a0")) {
      const decoded = ethers.utils.defaultAbiCoder.decode(
        ["string"],
        "0x" + data.slice(10)
      );
      return decoded[0] as string;
    }

    // Panic(uint256)
    if (data.startsWith("0x4e487b71")) {
      const decoded = ethers.utils.defaultAbiCoder.decode(
        ["uint256"],
        "0x" + data.slice(10)
      );
      const code = (decoded[0] as ethers.BigNumber).toNumber();
      return `Panic(${panicCodeDescription(code)})`;
    }
  } catch {
    // Decoding failed — ignore
  }
  return null;
}

function panicCodeDescription(code: number): string {
  const codes: Record<number, string> = {
    0x01: "assertion failed",
    0x11: "arithmetic overflow or underflow",
    0x12: "division by zero",
    0x21: "invalid enum value",
    0x22: "corrupted storage bytes",
    0x31: "pop on empty array",
    0x32: "array index out of bounds",
    0x41: "too much memory allocated",
    0x51: "call to invalid internal function",
  };
  return codes[code] ?? `code ${code}`;
}

/**
 * Wraps a contract write call with full gas estimation, balance check,
 * and revert reason parsing in a single helper.
 *
 * @param contract   Signing contract.
 * @param provider   Web3Provider.
 * @param address    Signer address.
 * @param method     Contract method name.
 * @param args       Method arguments.
 * @param overrides  Optional overrides (e.g. { value }).
 * @returns          Transaction receipt.
 */
export async function safeContractCall(
  contract:  ethers.Contract,
  provider:  ethers.providers.Web3Provider,
  address:   string,
  method:    string,
  args:      unknown[],
  overrides: ethers.PayableOverrides = {}
): Promise<ethers.ContractReceipt> {
  const value     = (overrides.value as ethers.BigNumber | undefined) ?? ethers.constants.Zero;
  const gasLimit  = await estimateGasWithBuffer(contract, method, args, overrides);
  await checkSufficientBalance(provider, address, value, gasLimit);

  try {
    const tx: ethers.ContractTransaction = await contract[method](...args, {
      ...overrides,
      gasLimit,
    });
    return await tx.wait();
  } catch (err: unknown) {
    const reason = await parseRevertReason(err);
    throw new Error(reason);
  }
}
