/** Max logo size before base64 encoding (~500 KB). Server caps the encoded string at 700k chars. */
export const MAX_LOGO_BYTES = 500 * 1024;

/** Reads an image File into a base64 data URL, or throws 'too-big' if over the size limit. */
export function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_LOGO_BYTES) return Promise.reject(new Error('too-big'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}
