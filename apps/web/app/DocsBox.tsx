// "Send your documents" instructions for pay-later orders: the checklist, Omora's WhatsApp number and a button that opens WhatsApp with the order number filled in.
export const waLink = (number: string, ref: string) => `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello Omora, I am sending my documents for pay-later order #${ref}.`)}`;
export default function DocsBox({ whatsapp, list, refCode, forwarded }: { whatsapp: string; list: string; refCode: string; forwarded?: string | null }) {
  return (<div className="docsbox"><b>Next: send your documents</b>
    <small>Send them on WhatsApp to Omora at <b>{whatsapp}</b>, and include your order number <b>#{refCode}</b>. Omora passes them to Baadae for your application.</small>
    {list && <ul>{list.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>}
    <a className="btn sm" href={waLink(whatsapp, refCode)} target="_blank" rel="noreferrer">💬 Send on WhatsApp</a>
    {forwarded && <small>✓ Omora passed your documents to Baadae on {new Date(forwarded).toLocaleDateString('en-KE')}.</small>}
    <small>Send nothing to any other number, and pay only through Omora checkout.</small></div>);
}
