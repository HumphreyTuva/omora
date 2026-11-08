// The Seller Registration & Marketplace Agreement, as text the website shows and the server records at the moment of acceptance.
// Text taken from Omora's draft agreement (only spacing/typing slips corrected). Change the wording here, then change AGREEMENT_VERSION:
// every acceptance stores the exact text and version the seller saw.
export const AGREEMENT_VERSION = '2026-11-v1';
export const PLANS = [
  { id: 'STARTER', name: 'Starter', registration: 500, monthly: 0, commission: 10 },
  { id: 'BUSINESS', name: 'Business', registration: 500, monthly: 1500, commission: 6 },
  { id: 'PREMIUM', name: 'Premium', registration: 500, monthly: 3000, commission: 3 },
];
export type Section = { title: string; body: string[] };
const planLines = PLANS.map(p => `${p.name}: one-time registration KES ${p.registration}; monthly subscription KES ${p.monthly.toLocaleString('en-KE')}; completed-sale commission ${p.commission}%.`);
export const SECTIONS: Section[] = [
  { title: '1. Parties and effective date', body: [
    'This Seller Registration & Marketplace Agreement (“Agreement”) is entered into on {{date}} between:',
    'Marketplace Operator: Hussein Mweri Jame, trading as “OMORA Marketplace” (“OMORA”), business registration no. BN-EOSBJ2LM, postal/physical address Nairobi, Kenya; and',
    'Seller: {{legalName}} (“Seller”), ID or registration no. {{idNumber}}, KRA PIN {{kraPin}}, principal address {{address}}.'] },
  { title: '2. Purpose and relationship', body: [
    'OMORA operates a digital marketplace where approved independent sellers may list eligible products, reach customers, and access promotional services. Unless OMORA expressly agrees otherwise in writing, the Seller is the supplier of the goods and is responsible for product ownership, legality, quality, stock, pricing, warranty commitments, fulfilment and after-sales service. This Agreement does not create employment, agency, franchise, partnership in the legal sense, or exclusivity.'] },
  { title: '3. Application and seller verification', body: [
    'Seller shall provide truthful, current information and supporting documents as reasonably requested, including:',
    '• Full name, business/trading name, business description, business registration certificate (where applicable), national ID/passport of owner or authorised representative, KRA PIN and relevant permits where required.',
    '• Physical business location, county, delivery/collection locations, phone/WhatsApp, email, and nominated contact person.',
    '• Product categories, sample listings, photographs, pricing, source/ownership information, warranty/returns terms, and any relevant product authorisations.',
    '• Payout account details in the Seller’s verified name (bank or approved mobile-money account) and proof of authority for any representative.'] },
  { title: '4. Account approval and listing rules', body: [
    'An account becomes active only after verification, acceptance of this Agreement and payment of applicable approved fees. Each Seller receives an OMORA seller profile/ID. OMORA may review, edit for formatting, reject or remove listings that violate its policies. Seller shall keep prices, specifications, photos, stock and availability accurate, and must not list counterfeit, stolen, unsafe, prohibited or unlawfully imported goods.'] },
  { title: '5. Plans, fees and commissions and package subscription', body: [
    'The following are PROPOSED introductory commercial terms and become binding only when selected in a signed Schedule A or confirmed by OMORA in an approved fee notice accepted by Seller:',
    ...planLines,
    'Package A – Standard Seller Package: Seller profile visibility, logistics, and delivery coordination.',
    'Package B – Marketing Seller Package: All Package A services, plus two weekly promotional videos, one produced by the seller and one by OMORA marketers.',
    'Package C – Premium Seller Package: All Package A and B services, plus targeted product recommendations to potential buyers.'] },
  { title: '6. Orders, payments, commission and seller payouts', body: [
    'OMORA Marketplace shall pay the seller two days after delivery and customer satisfaction. This helps OMORA manage customer complaints, undelivered orders, and potential refund requests before releasing the seller’s funds. The amount to be paid will be the stipulated amount after commission, delivery fee and packaging fee deduction.'] },
  { title: '7. Subscriptions, renewals and account status', body: [
    'Subscriptions renew monthly from the activation date unless cancelled under clause 13. OMORA shall send a renewal reminder where practicable. A proposed seven (7)-day grace period applies after a missed payment; promotional benefits may pause during this period. If unpaid after the grace period, OMORA may suspend promotional services. Reactivation is subject to payment and any renewed verification; OMORA will not charge a new registration fee solely for a routine reactivation unless clearly agreed in advance.'] },
  { title: '8. Marketing and content permissions', body: [
    'Subject to the selected plan and timely Seller cooperation, OMORA marketers may produce and publish weekly promotional videos on OMORA Marketplace channels. Seller grants OMORA a non-exclusive, royalty-free licence during the Agreement to use Seller-supplied product images, logos, descriptions and approved business identifiers for listing and promotion, and confirms it has rights to provide them. OMORA retains rights to its independently created creative work, subject to third-party rights. Use of identifiable people’s images or testimonials requires appropriate consent. OMORA may decline misleading claims or unsafe content. Posting dates are subject to a reasonable content calendar, availability of assets and platform rules.'] },
  { title: '9. Seller fulfilment, consumer rights and returns', body: [
    'Seller shall confirm availability promptly, package goods safely, hand over within the agreed timeframe, issue required receipts and documentation, honour accurate descriptions and warranties, and respond promptly to customer complaints. Seller shall comply with applicable Kenyan consumer protection, product safety, tax and other laws. Mandatory customer rights cannot be excluded by this Agreement. Refunds, returns, defective items and delivery failures shall be handled under a separate published Returns & Disputes Policy consistent with applicable law; until published, parties must agree fair case-by-case resolutions consistent with legal requirements.'] },
  { title: '10. Prohibited conduct and platform integrity', body: [
    '• No counterfeit or stolen goods, false discounts, fake reviews, impersonation, undisclosed refurbished condition, misleading warranty claims or manipulated product specifications.',
    '• No harassment, discriminatory conduct, unauthorised use of customer data, or direct contact for unrelated marketing without appropriate permission.',
    '• No commission avoidance, deceptive order cancellation, fake transactions or attempts to compromise marketplace accounts.'] },
  { title: '11. Privacy, confidentiality and security', body: [
    'Each party shall protect personal information, use customer data only as necessary to process orders and meet legal duties, implement reasonable security controls, report suspected personal-data breaches promptly to the other party, and cooperate with applicable notification obligations. Seller shall keep non-public OMORA business information, customer records and pricing arrangements confidential except where disclosure is required by law.'] },
  { title: '12. Complaints, liability and disputes', body: [
    'Each party is responsible for its own misconduct, negligence and legal non-compliance. Seller is responsible for claims arising from its products, inaccurate listings, intellectual-property violations and failure to fulfil orders, to the extent permitted by law. OMORA is responsible for its own marketplace services and representations. Neither party excludes liability that cannot lawfully be excluded, including applicable consumer rights. Parties will first attempt good-faith resolution within fourteen (14) days of written notice, then may pursue mediation by agreement or the competent courts of Kenya. Kenyan law governs this Agreement.'] },
  { title: '13. Suspension, termination and changes', body: [
    'Seller may request account closure on fourteen (14) days’ written notice; OMORA may terminate on thirty (30) days’ written notice, subject to outstanding orders and obligations. Immediate suspension may occur for credible fraud, illegal products, serious safety risks or material breach, with notice and an opportunity to respond where reasonably possible. On closure, accrued fees, valid refunds, disputes, records-retention duties and earned commissions survive. OMORA may update fees or material policies only on at least thirty (30) days’ advance notice; changes apply prospectively, and Seller may terminate before they take effect without new subscription charges.'] },
  { title: '14. Notices and contact', body: [
    'Applications and formal correspondence: omoramarketplace@gmail.com | WhatsApp/telephone: 0114085410. Formal notices shall be sent to the verified email addresses stated in Schedule A, with acknowledgement or other reliable delivery evidence.'] },
  { title: '15. Return and refund policy', body: [
    'OMORA Marketplace is committed to protecting both buyers and sellers by ensuring fair and transparent return and refund procedures. Customers may request a return within 7 days of receiving a product if it is defective, damaged, counterfeit, incorrect, or significantly different from the advertised description. All returned products must be accompanied by proof of purchase and, where reasonably possible, their original packaging and accessories. Returns shall be subject to verification by OMORA Marketplace. Where a return is approved, the customer shall be entitled to a replacement or refund, as appropriate. Sellers shall be responsible for costs arising from defective, misrepresented, or incorrectly supplied products. Products damaged through customer misuse or unauthorized modifications may be excluded from voluntary returns, subject to applicable consumer protection laws. Refunds shall be processed within 7 business days following approval, subject to the original payment method and applicable payment processing timelines. OMORA Marketplace reserves the right to investigate return disputes and facilitate fair resolutions in accordance with the laws of Kenya.'] },
  { title: 'Schedule A: Seller enrolment and commercial elections', body: [
    'Seller trading name: {{tradingName}}',
    'Seller representative / position: {{representative}}, {{position}}',
    'Business location / county: {{location}}',
    'Verified email / mobile: {{contact}}',
    'Seller plan: {{planName}}',
    'Registration fee: KES {{registration}}   Monthly fee: KES {{monthly}}   Commission rate: {{commission}}%',
    'Payment model: A, OMORA-collected',
    'Payout method / verified account: as saved in the Seller’s payout details and verified by OMORA'] },
];
export const fill = (t: string, v: Record<string, string>) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? '');
export const renderAgreement = (v: Record<string, string>) => SECTIONS.map(s => `${s.title}\n${s.body.map(b => fill(b, v)).join('\n')}`).join('\n\n');
