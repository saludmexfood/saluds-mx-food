'use client';

export function setAdminSession(token: string) {
  localStorage.setItem('access_token', token);
  document.cookie = `admin_token=${token}; path=/; max-age=3600; samesite=lax`;
}

export function clearAdminSession() {
  localStorage.removeItem('access_token');
  document.cookie = 'admin_token=; path=/; max-age=0; samesite=lax';
}

export function hasAdminSession() {
  return Boolean(localStorage.getItem('access_token'));
}
