type DownloadEnvironment = {
  createLink: () => HTMLAnchorElement;
  appendLink: (link: HTMLAnchorElement) => void;
  createUrl: (blob: Blob) => string;
  revokeUrl: (url: string) => void;
  later: (callback: () => void, delay: number) => unknown;
};

/** Keep the URL alive through browser download prompts; click a connected anchor. */
export function downloadBlob(
  blob: Blob,
  filename: string,
  environment?: DownloadEnvironment,
) {
  const env = environment || {
    createLink: () => document.createElement("a"),
    appendLink: (link: HTMLAnchorElement) => document.body.append(link),
    createUrl: (value: Blob) => URL.createObjectURL(value),
    revokeUrl: (url: string) => URL.revokeObjectURL(url),
    later: (callback: () => void, delay: number) =>
      window.setTimeout(callback, delay),
  };
  const url = env.createUrl(blob);
  const link = env.createLink();
  link.href = url;
  link.download = filename;
  link.hidden = true;
  try {
    env.appendLink(link);
    link.click();
  } catch (error) {
    env.revokeUrl(url);
    throw error;
  } finally {
    link.remove();
  }
  env.later(() => env.revokeUrl(url), 60000);
}
