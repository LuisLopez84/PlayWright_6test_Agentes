/**
 * Represents a single normalized step produced by the recording parser.
 * Used as the canonical type across recorder-parser-agent and run-agents.
 *
 * Risk 3: `action` is required so callers can narrow the type at compile time.
 * Risk 5: declared as `type` alias — the shape is never extended.
 */
export type Action = {
  /** Primary action verb: 'click' | 'fill' | 'navigate' | 'hover' | 'press_key' |
   *  'press_enter' | 'select' | 'check' | 'uncheck' | 'dblclick' | 'drag_drop' |
   *  'upload' | 'download' | 'scroll' | 'frame_action' | 'verify' | 'popup' | 'close_tab' */
  action: string; // Risk 3: required — was optional

  /** Human-readable label / ARIA name of the target element */
  target?: string;

  /** Value to fill, key to press, or option to select */
  value?: string;

  // ── Playwright selector variants ──────────────────────────────────────────

  /** CSS / Playwright selector string for the primary element */
  selector?: string;

  /** Playwright locator expression (getByRole, getByText, …) */
  locator?: string;

  /** Ordered list of fallback selectors for the primary element */
  selectors?: string[];

  // ── Navigation context ────────────────────────────────────────────────────

  /** Absolute URL for 'navigate' actions */
  url?: string;

  /** Locator strategy used: 'role' | 'text' | 'css' | 'list-text' */
  source?: string;

  // ── Drag & drop ───────────────────────────────────────────────────────────

  /** Playwright selector for the drop-target element */
  targetSelector?: string;

  // ── iframes ───────────────────────────────────────────────────────────────

  /** CSS selector of the parent iframe, e.g. `"iframe[name='payment']"` */
  frameSelector?: string;

  // ── Popups / new tabs ─────────────────────────────────────────────────────

  /** Variable name bound to the new page, e.g. `"page1"` */
  pageRef?: string;

  /** True when the action is expected to open a new browser context */
  popupTrigger?: boolean;

  // ── Inline editing (dblclick → fill pattern) ──────────────────────────────

  /** True when a double-click is followed immediately by a fill on the same element */
  _editIntent?: boolean;

  // ── Verification ──────────────────────────────────────────────────────────

  /** Assertion kind: 'text' | 'url' | 'title' | 'visible' | 'hidden' */
  verifyType?: string;

  // ── Raw source ────────────────────────────────────────────────────────────

  /** Original source line from the Playwright codegen recording (Risk 4: string, not any) */
  raw?: string; // Risk 4: was `raw?: any`
};
