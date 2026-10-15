/** Keep auth return paths inside this app, including browser URL normalization. */
export function authReturnPath(next: string | null) {
  return next?.startsWith("/") &&
    !next.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(next)
    ? next
    : "/dashboard";
}
