/** Operate the public bridge panel; walking back through the exit remains the caller's job. */
export async function signalAtBridge(page, mobile = false) {
  const activate = locator => mobile ? locator.tap() : locator.click();
  await page.getByTestId('bridge-puzzle').waitFor();
  await activate(page.getByTestId('bridge-inspect-boards'));
  await activate(page.getByTestId('bridge-inspect-rope'));
  if (await page.getByTestId('bridge-read-wait').isVisible()) await activate(page.getByTestId('bridge-read-wait'));
  await activate(page.getByTestId('bridge-slot-reason'));
  await activate(page.getByTestId('bridge-word-danger'));
  await activate(page.getByTestId('bridge-slot-intent'));
  await activate(page.getByTestId('bridge-word-wait'));
  await activate(page.getByTestId('bridge-signal'));
  await page.getByTestId('bridge-puzzle').waitFor({ state: 'hidden' });
}
