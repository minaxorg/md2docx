import JSZip from "jszip";

/**
 * 打开一个 docx/zip 文件的 ArrayBuffer/Buffer，返回一个带 read 方法的对象
 * @param {ArrayBuffer|Buffer|Uint8Array} arrayBuffer
 * @returns {Promise<{read: (path: string, encoding?: string) => Promise<string|Uint8Array>}>}
 */
export async function openArrayBuffer(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);

  return {
    /**
     * 读取 zip 内部文件
     * @param {string} path zip 内部路径，如 'word/styles.xml'
     * @param {string} [encoding] 可选，'utf-8' 返回字符串，否则返回 Uint8Array
     * @returns {Promise<string|Uint8Array>}
     */
    async read(path, encoding) {
      const file = zip.file(path);
      if (!file) throw new Error(`File not found in zip: ${path}`);
      if (encoding === "utf-8") {
        return await file.async("string");
      } else {
        return await file.async("uint8array");
      }
    }
  };
}