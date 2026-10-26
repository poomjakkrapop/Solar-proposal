/** Stage asynchronously; never publish work from a cancelled/older preview. */
export async function stagePreview<T>(
  render: () => Promise<T>,
  active: () => boolean,
  publish: (result: T) => void,
) {
  const result = await render();
  if (active()) publish(result);
}
