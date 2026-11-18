import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hito-Perfil · Perfil diagnóstico por hitos',
  description:
    'Sistema de perfilado académico por hitos (Inicial, Intermedio y Final) — Sociedad de Investigación, Ingeniería de Sistemas, UAB.',
};

// Sin fuentes remotas: la demostración funciona aunque la red del congreso no tenga internet.
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
