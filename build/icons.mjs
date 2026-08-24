// Icon data URIs, one per brand — the same artwork was pasted into four headers
// before. @icon64 is derived by swapping the size, so only one copy lives here.
export const icons = {
  github:
    'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E',
  graphite:
    'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2028%2028%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22m20.704%207.123-9.27-2.484-6.788%206.793%202.482%209.276%209.27%202.484%206.788-6.793-2.482-9.276Z%22%3E%3C/path%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M17.644%200%203.73%203.729%200%2017.644l10.187%2010.187%2013.915-3.729%203.73-13.915L17.643%200Zm2.27%2024.312H7.917L1.92%2013.915%207.917%203.518h11.997l5.998%2010.397-5.998%2010.397Z%22%3E%3C/path%3E%3C/svg%3E',
  geo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%238a8f98' d='M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z'/%3E%3Cpath fill='none' stroke='%23e5484d' stroke-width='2.4' stroke-linecap='round' d='M4.5 3.5l15 17'/%3E%3C/svg%3E",
  okta: 'https://www.okta.com/favicon.ico',
};

/** Same SVG at another size; plain URLs (okta favicon) pass through unchanged. */
export function atSize(uri, px) {
  return uri.replace(/%2248%22/g, `%22${px}%22`);
}
