// 利用可能なメールドメイン(=登録可能な大学)。
// 増やすときはここに足すだけで OK。ログイン画面とサークル管理画面の両方が参照しています。
export const ALLOWED_EMAIL_DOMAINS = [
  "@mail.kyutech.jp",     // 九州工業大学(現行)
  "@mail.kyutech.ac.jp",  // 九州工業大学(旧/別ドメイン)
  "@seinan-jo.ac.jp",     // 西南女子大学
] as const;

/** 登録可能なメールアドレスかどうかを判定する */
export function isAllowedEmail(email: string): boolean {
  const v = email.trim().toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((d) => v.endsWith(d));
}

/** UI 上で「許可ドメイン」を1行で表示するときに使う文字列 */
export const ALLOWED_DOMAINS_LABEL = "@mail.kyutech.jp / @seinan-jo.ac.jp";
