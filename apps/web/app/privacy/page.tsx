const name = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Omora', email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
export const metadata = { title: 'Privacy policy — Omora' };
export default function Privacy() {
  return (<main className="wrap legal"><h1>Privacy policy</h1><p><small>Last updated: {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</small></p>
    <p>{name} (“we”, “us”) runs the Omora online marketplace, where customers buy from independent sellers. This policy explains what personal information we collect, why, and the choices you have.</p>
    <h2>Information we collect</h2>
    <ul>
      <li><b>Account details:</b> your email address and/or phone number, and your name and email if you sign in with Google.</li>
      <li><b>Orders and payments:</b> the items you buy, order amounts, the M-Pesa phone number you pay from, and the payment status and reference Safaricom returns. We never see or store your M-Pesa PIN.</li>
      <li><b>Seller information:</b> if you sell on Omora, your store name and the products, prices and photos you upload.</li>
      <li><b>Activity:</b> notifications we send you, reviews you write, items you save to your wishlist, and basic technical logs that help us keep the service secure.</li>
    </ul>
    <h2>How we use it</h2>
    <ul>
      <li>To create and secure your account, and to send sign-in codes.</li>
      <li>To process orders and payments, arrange delivery and handle refunds.</li>
      <li>To send order and payment updates by in-app notification, SMS or email.</li>
      <li>To prevent fraud and misuse, and to meet legal obligations.</li>
    </ul>
    <h2>Who we share it with</h2>
    <p>We share information only as needed to run the service: with the seller of the items you order (so they can fulfil your order), and with service providers that process data for us, including Safaricom (M-Pesa payments), Google (sign-in), our email and SMS providers, and our hosting, database and file-storage providers. We do not sell your personal information.</p>
    <h2>Cookies and local storage</h2>
    <p>We use your browser’s local storage to keep you signed in and to remember your cart. We do not use advertising cookies. Google may set its own cookies when you choose to sign in with Google.</p>
    <h2>How long we keep it</h2>
    <p>We keep your information while your account is active and for as long as needed to handle orders, refunds, disputes and legal or accounting requirements. You may ask us to delete your account, subject to those requirements.</p>
    <h2>Your rights</h2>
    <p>Under Kenya’s Data Protection Act, 2019, you may ask to access, correct or delete your personal data, and to object to or restrict certain processing. To make a request, contact us{email ? <> at <a href={`mailto:${email}`}>{email}</a></> : <> through the <a href="/contact">contact page</a></>}.</p>
    <h2>Children</h2>
    <p>Omora is not intended for people under 18, and we do not knowingly collect their information.</p>
    <h2>Changes to this policy</h2>
    <p>We may update this policy from time to time. The date at the top shows when it last changed.</p>
  </main>);
}
