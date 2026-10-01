/** Публичный снимок пользователя для UI и session (без passwordHash). */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
};
