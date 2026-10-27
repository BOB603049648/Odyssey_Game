import zh from '../../content/locales/zh-CN.json';

export type MessageKey = keyof typeof zh;

export function t(key: MessageKey): string {
  return zh[key];
}
