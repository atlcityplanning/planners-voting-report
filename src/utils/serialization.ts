import { IntakeFormData } from "./form.schema";

/**
 * Encodes the form data into a Base64 string for URL sharing.
 * Removes assets as they cannot be serialized reasonably into a URL.
 */
export function encodeRequest(data: IntakeFormData): string {
  // Create a copy of assets that strips out heavy content for files
  const safeAssets = data.assets?.map((asset) => {
    if (asset.type === "file") {
      // Return metadata only for files to keep URL size down
      const { url, ...metadata } = asset;
      return metadata;
    }
    // Links are fine as is
    return asset;
  });

  const safeData = { ...data, assets: safeAssets };

  try {
    const json = JSON.stringify(safeData);
    // Encode to Base64, handling UTF-8 characters
    return btoa(startEncoding(json));
  } catch (e) {
    console.error("Failed to encode request data", e);
    return "";
  }
}

/**
 * Decodes the Base64 string back into IntakeFormValues.
 */
export function decodeRequest(encoded: string): IntakeFormData | null {
  try {
    const json = stopEncoding(atob(encoded));
    return JSON.parse(json) as IntakeFormData;
  } catch (e) {
    console.error("Failed to decode request data", e);
    return null;
  }
}

// Helper to handle UTF-8 characters in Base64
// Source: MDN - https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
function startEncoding(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
  return binString;
}

function stopEncoding(binString: string): string {
  const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0) ?? 0);
  return new TextDecoder().decode(bytes);
}
