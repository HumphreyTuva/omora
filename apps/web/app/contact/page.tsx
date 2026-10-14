const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL, phone = process.env.NEXT_PUBLIC_CONTACT_PHONE, address = process.env.NEXT_PUBLIC_CONTACT_ADDRESS;
export const metadata = { title: 'Contact us — Omora' };
export default function Contact() {
  return (<main className="wrap legal"><h1>Contact us</h1>
    <p>Questions about an order, a payment, a refund or selling on Omora? Get in touch and we will reply as soon as we can.</p>
    <div className="cards">
      {email && <div className="order"><b>Email</b><p><a href={`mailto:${email}`}>{email}</a></p></div>}
      {phone && <div className="order"><b>Phone</b><p><a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></p></div>}
      {address && <div className="order"><b>Address</b><p>{address}</p></div>}
      {!email && !phone && !address && <div className="order"><p>Contact details are being set up. Please check back soon.</p></div>}
    </div>
    <p><small>When you write to us about an order, please include your order number (for example #A1B2C3D4) so we can help faster.</small></p>
  </main>);
}
