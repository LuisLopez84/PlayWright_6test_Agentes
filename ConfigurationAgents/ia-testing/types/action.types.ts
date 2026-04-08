export interface Action {
    type?: string;
target?: string;
value?: string;

// 🔥 SELECTORES UNIVERSALES (Playwright recorder variants)
selector?: string;
locator?: string;
selectors?: string[];

// 🔥 RAW DATA (por si cambia Playwright en el futuro)
raw?: any;
}