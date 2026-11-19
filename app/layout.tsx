import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sourav Dairy · WhatsApp Agent',
  description:
    'WhatsApp ordering agent for a milk delivery business — orders, subscriptions, pauses, dues and an owner dashboard.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/" className="brand">
            <span className="brand-mark">🥛</span>
            <span>
              Sourav Dairy
              <small>WhatsApp agent</small>
            </span>
          </Link>
          <nav>
            <Link href="/chat">Chat demo</Link>
            <Link href="/dashboard">Owner dashboard</Link>
            <Link href="/chat" className="primary">
              Try the bot
            </Link>
          </nav>
        </header>
        {children}
        <div className="page" style={{ paddingTop: 0 }}>
          <div className="footer-note">
            <span>
              Built for a daily milk route · Hinglish · Hindi · English · orders in Supabase or local
              JSON
            </span>
            <span>Delivery window 5:00–7:30 AM · cut-off 9:00 PM</span>
          </div>
        </div>
      </body>
    </html>
  );
}
