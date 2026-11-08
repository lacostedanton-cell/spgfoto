import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'СПГfoto — фотобаза транспорта', description: 'Фотографии городского, железнодорожного и водного транспорта' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
