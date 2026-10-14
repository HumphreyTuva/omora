const name = process.env.NEXT_PUBLIC_BUSINESS_NAME || 'Omora';
export const metadata = { title: 'Terms of use — Omora' };
export default function Terms() {
  return (<main className="wrap legal"><h1>Terms of use</h1><p><small>Last updated: {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</small></p>
    <p>These terms apply when you use the Omora marketplace operated by {name}. By creating an account or placing an order, you agree to them.</p>
    <h2>How Omora works</h2>
    <p>Omora is a marketplace. Products are listed and sold by independent sellers. Omora provides the platform, takes payment on the seller’s behalf, and arranges delivery. Sellers are responsible for their listings, prices, stock and the quality of what they sell.</p>
    <h2>Accounts</h2>
    <p>You must be at least 18 and give accurate information. Keep your sign-in details secure; you are responsible for activity on your account.</p>
    <h2>Orders and prices</h2>
    <p>Prices are shown in Kenya shillings (KSh). Delivery fees are shown at checkout before you pay. An order is confirmed once your payment is received. We may cancel an order if an item is unavailable or a listing contains an obvious error, and we will refund any payment made.</p>
    <h2>Payment</h2>
    <p>Payments are made by M-Pesa. You authorise the payment by entering your M-Pesa PIN on your own phone. If a payment fails, you are not charged for the order; if money is taken but your order does not show as paid, contact us and we will resolve it.</p>
    <h2>Delivery</h2>
    <p>Delivery times are estimates and may vary. Risk in the goods passes to you when they are delivered.</p>
    <h2>Returns and refunds</h2>
    <p>If an item arrives damaged, is not as described, is the wrong item or is missing, you can request a refund from the My Orders page within 7 days of delivery. Approved refunds are returned through M-Pesa. Items must be unused and in their original condition unless the problem is a defect.</p>
    <h2>Seller rules</h2>
    <p>Sellers must list only genuine items they are entitled to sell, describe them accurately, keep stock up to date, fulfil confirmed orders promptly, and pay Omora’s commission on each sale. Counterfeit, illegal, stolen or unsafe goods are not allowed, and we may remove listings or suspend sellers who break these rules.</p>
    <h2>Acceptable use</h2>
    <p>Do not misuse the service: no fraud, no fake reviews, no attempts to interfere with the platform or other users’ accounts.</p>
    <h2>Our responsibility</h2>
    <p>We work to keep Omora running reliably but cannot promise it will always be available or error-free. To the extent the law allows, we are not liable for indirect losses, and our total liability for any order is limited to the amount you paid for it. Nothing here limits rights you have under Kenyan consumer protection law.</p>
    <h2>Changes and governing law</h2>
    <p>We may update these terms; continued use means you accept the updated terms. These terms are governed by the laws of Kenya.</p>
    <h2>Contact</h2>
    <p>Questions about these terms? Visit our <a href="/contact">contact page</a>.</p>
  </main>);
}
