// Site footer with the pages shops are expected to have. Business details come from settings (see .env.example).
export default function Footer() {
  const name = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Omora';
  return (<footer className="foot sitefoot">
    <div className="fgrid3">
      <div><img src="/logo-dark.png" alt="Omora All-in-One Marketplace" /><p>Everything You Need. Connected.</p></div>
      <div><h4>Shop</h4><a href="/">Home</a><a href="/orders">My orders</a><a href="/seller/apply">Become a seller</a></div>
      <div><h4>Help &amp; legal</h4><a href="/contact">Contact us</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a></div>
    </div>
    <div className="copy"><span>© {new Date().getFullYear()} {name}. All rights reserved.</span><span>Pay safely with M-Pesa</span></div>
  </footer>);
}
