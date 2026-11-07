/**
 * FailureAI :: domain knowledge for the Local Engine.
 * Zero-dependency, deterministic, offline-capable intelligence layer.
 * Everything here is used to produce genuinely structured output even when
 * no LLM key is configured (demo mode / first run / cost-free usage).
 */

export const TOOLS = ['all', 'intel', 'ads', 'creative', 'code', 'prompts', 'calendar', 'seo'];

export const PROVIDERS = ['auto', 'local', 'openai', 'gemini', 'anthropic'];

export const LANGUAGES = ['hinglish', 'hindi', 'english'];
export const TONES = ['bold', 'friendly', 'premium', 'witty'];
export const GOALS = ['leads', 'sales', 'awareness', 'traffic'];

/* ------------------------------------------------------------------ */
/* small deterministic helpers                                         */
/* ------------------------------------------------------------------ */

export function hash(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function pick(arr, seed = 0) {
  if (!arr || !arr.length) return '';
  return arr[Math.abs(seed) % arr.length];
}

export function pickN(arr, n, seed = 0) {
  if (!arr || !arr.length) return [];
  const out = [];
  const step = Math.max(1, Math.floor(arr.length / Math.max(n, 1))) || 1;
  for (let i = 0; i < Math.min(n, arr.length); i++) {
    out.push(arr[(Math.abs(seed) + i * (step + 1) + i * i) % arr.length]);
  }
  return [...new Set(out)];
}

export function tpl(str = '', vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

export function titleCase(str = '') {
  return str
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function slugify(str = '') {
  return str
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
}

export function brandFrom(input = '') {
  let s = String(input).trim();
  if (!s) return 'Aapka Brand';
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0].trim();
  if (/^[\w-]+(\.[\w-]+)+$/.test(s) && !/\s/.test(s)) {
    const parts = s.split('.');
    return titleCase((parts.length > 2 ? parts[parts.length - 2] : parts[0]).replace(/[-_]/g, ' '));
  }
  return titleCase(s.replace(/[|•–—].*$/, '').replace(/[^\p{L}\p{N}\s&-]/gu, '')) || 'Aapka Brand';
}

/* ------------------------------------------------------------------ */
/* industry presets                                                    */
/* ------------------------------------------------------------------ */

const P = (o) => ({
  label: 'Business / Services',
  detect: [],
  audience: [],
  pains: ['paise ka waste hona', 'clear strategy na hona', 'lead quality weak hona'],
  desires: ['zyda aur better customers', 'mehnat kam, result zyada', 'brand pe bharosa'],
  usp: ['Personalised approach', 'Fast turnaround', 'Transparent pricing', 'Proof-backed results'],
  primary: ['{industry} near me', 'best {industry}', '{industry} services', '{brand} reviews'],
  secondary: ['{industry} price', '{industry} online', 'top {industry} {city}', '{industry} for small business'],
  longTail: ['affordable {industry} in {city} with free consultation', 'how to choose {industry} for beginners'],
  negative: ['free', 'jobs', 'course', 'pdf', 'torrent'],
  channels: [
    { name: 'Meta & Instagram', why: 'Visual proof + local targeting se fastest discovery', priority: 'High' },
    { name: 'Google Search', why: 'High-intent "near me" queries pakadne ke liye', priority: 'High' },
    { name: 'WhatsApp / CRM', why: 'Lead ko nurture karke booking tak le jana', priority: 'High' },
    { name: 'YouTube / Reels', why: 'Process aur results dikhakar trust banana', priority: 'Medium' },
    { name: 'LinkedIn', why: 'Partnerships aur B2B authority ke liye', priority: 'Medium' },
  ],
  competitors: ['Market leader', ' Aggressive discounter', 'Niche specialist'],
  quickWins: [
    'Google Business Profile ko 100% complete karo: photos, hours, Q&A, services',
    'Top 10 reviews maango aur har review ka reply 24 ghante me do',
    'Ek "before / after" proof post roz 7 din tak daalo',
    'Website par ek hi clear CTA + click-to-WhatsApp button lagao',
    'Pichhle 90 din ke leads ko ek personalized re-engagement message bhejo',
    '3 landing pages banao: ek per core service, with city in H1',
  ],
  visual: {
    direction: 'clean editorial photography, real people, warm natural light, confident composition',
    palette: ['#B8FF3C', '#7C5CFF', '#0B0D12', '#F5F5F2'],
    subjects: ['happy customer using the service', 'product / result close-up', 'team at work', 'before-and-after comparison'],
  },
  kpis: ['Cost per lead', 'Lead → customer %', 'ROAS', 'Repeat / referral rate'],
  ...o,
});

export const INDUSTRIES = {
  generic: P({}),
  restaurant: P({
    label: 'Food & Beverage / Restaurant',
    detect: ['restaurant', 'cafe', 'food', 'pizza', 'bakery', 'cloud kitchen', 'dhaba', 'hotel', 'sweet', 'खाना', 'कैफे'],
    audience: [
      { segment: 'Local foodies 18–35', pains: ['same old options', 'delivery late hona'], desires: ['naya taste', 'instagrammable plate'] },
      { segment: 'Office crowd & families', pains: ['lunch time me rush', 'value for money'], desires: ['quick service', 'combo deals'] },
      { segment: 'Weekend planners', pains: ['decision fatigue'], desires: ['ambience + experience', 'easy booking'] },
    ],
    pains: ['repeat customers kam', 'Swiggy/Zomato commission', 'off-peak hours empty'],
    desires: ['full tables', 'direct orders', 'viral dish'],
    usp: ['Signature dish jo kahin aur na mile', 'Fresh, daily-made', '30-min delivery promise', 'Direct-order discount'],
    primary: ['best restaurant near me', '{city} cafe', 'food delivery {city}', '{brand} menu'],
    secondary: ['birthday dinner place {city}', 'best pizza {city}', 'family restaurant near me', 'late night food {city}'],
    longTail: ['romantic candle light dinner in {city} under budget', 'best pure veg thali near me open now'],
    competitors: ['Big aggregator-listed chains', 'Discount-heavy cloud kitchens', 'Legacy local favourite'],
    quickWins: [
      'Google Business Profile me 20+ dish photos + menu link update karo',
      'Zomato/Swiggy ke andar "direct order pe 15% off" card daalo',
      'Ek signature dish ko 7 din ka Reels series banao',
      'Off-peak 3–6 PM "happy hours" combo launch karo',
      'Har table pe QR review card + Google review link',
      'Last 100 orders ko WhatsApp pe "miss you" offer bhejo',
    ],
    visual: { direction: 'mouth-watering overhead food photography, steam, rich texture, moody warm light', palette: ['#FF7A3D', '#FFD84D', '#1A120B', '#FFF6E8'], subjects: ['hero dish overhead', 'chef plating', 'friends sharing a table', 'close-up of texture'] },
    kpis: ['Direct order %', 'Table occupancy', 'Repeat order rate', 'Cost per order'],
  }),
  fitness: P({
    label: 'Fitness / Gym / Yoga',
    detect: ['gym', 'fitness', 'yoga', 'workout', 'zumba', 'crossfit', 'trainer', 'जिम'],
    audience: [
      { segment: 'Beginners 22–35', pains: ['shuruat ka dar', 'consistency na hona'], desires: ['visible change', 'guidance'] },
      { segment: 'Working professionals', pains: ['time nahi', 'sedentary lifestyle'], desires: ['30-min effective workout', 'energy'] },
      { segment: 'Post-partum / 40+', pains: ['joint issues', 'confidence'], desires: ['safe program', 'community'] },
    ],
    pains: ['trial to membership conversion kam', 'January ke baad churn', 'trainer dependency'],
    desires: ['waiting list', 'transformation stories', 'referrals'],
    usp: ['7-day free trial with a plan', 'Certified coaches + form check', 'Small batches', 'Progress tracking app'],
    primary: ['gym near me', '{city} fitness studio', 'personal trainer {city}', 'yoga classes near me'],
    secondary: ['gym membership price {city}', 'weight loss program {city}', 'ladies only gym {city}', 'beginner workout plan'],
    longTail: ['best gym in {city} with personal trainer for beginners', '30 day transformation challenge near me'],
    competitors: ['Big chained gyms', 'Budget local gyms', 'Home-workout apps'],
    visual: { direction: 'high-energy motion, sweat, dramatic side light, diverse real bodies, bold typography space', palette: ['#C6FF00', '#FF3D71', '#101014', '#FFFFFF'], subjects: ['athlete mid-rep', 'trainer correcting form', 'transformation split', 'class energy shot'] },
    kpis: ['Trial → paid %', 'Cost per trial', '30-day retention', 'Referral signups'],
  }),
  health: P({
    label: 'Clinic / Healthcare / Wellness',
    detect: ['clinic', 'doctor', 'dental', 'dentist', 'dentistry', 'hospital', 'derma', 'skin', 'physio', 'ayurveda', 'क्लिनिक'],
    audience: [
      { segment: 'Symptom-aware searchers', pains: ['confusing information', 'delay'], desires: ['clear answer', 'quick appointment'] },
      { segment: 'Family decision makers', pains: ['trust issue', 'cost unclear'], desires: ['experienced doctor', 'transparent fee'] },
      { segment: 'Chronic-care patients', pains: ['regular follow-up'], desires: ['continuity', 'reminders'] },
    ],
    pains: ['no-show appointments', 'low trust online', 'generic content'],
    desires: ['booked calendar', '5-star reputation', 'patient education'],
    usp: ['Specialist-led consultation', 'Same-day appointment', 'Transparent pricing', 'Follow-up care built in'],
    primary: ['best {industry} clinic {city}', 'doctor near me', '{brand} appointment', 'skin specialist near me'],
    secondary: ['{industry} treatment cost', 'is {industry} safe', 'clinic open near me', 'best dentist {city} reviews'],
    longTail: ['painless {industry} treatment in {city} with emi option', 'when should i see a {industry} specialist'],
    competitors: ['Corporate hospital chains', 'Single-doctor neighbourhood clinics', 'Telemedicine apps'],
    visual: { direction: 'calm clinical light, reassuring human faces, clean whites and soft teal, no stock-handshake cliches', palette: ['#26D0B3', '#0E7C86', '#F7FBFA', '#0B1F22'], subjects: ['doctor with patient', 'bright treatment room', 'before/after with consent', 'explainer diagram'] },
    kpis: ['Appointment bookings', 'Show-up rate', 'Cost per booking', 'Review rating'],
  }),
  realestate: P({
    label: 'Real Estate / Property',
    detect: ['real estate', 'property', 'builder', 'flat', 'plot', 'realtor', 'प्रॉपर्टी'],
    audience: [
      { segment: 'First-time buyers 28–40', pains: ['loan confusion', 'trust deficit'], desires: ['clear paperwork', 'safe investment'] },
      { segment: 'Investors / NRI', pains: ['verify karna mushkil'], desires: ['ROI data', 'site visit'] },
      { segment: 'Families upgrading', pains: ['location vs budget'], desires: ['schools + commute', 'amenities'] },
    ],
    pains: ['unqualified leads', 'long sales cycle', 'site visit drop-offs'],
    desires: ['verified site visits', 'faster closures', 'referral chain'],
    usp: ['Verified legal documents', 'Virtual + physical site tour', 'EMI calculator', 'Dedicated relationship manager'],
    primary: ['2 bhk flat in {city}', 'property for sale {city}', '{brand} project', 'plots near me'],
    secondary: ['ready to move flats {city}', 'best area to invest {city}', 'home loan eligibility', 'new launch {city}'],
    longTail: ['ready to move 2 bhk in {city} under 60 lakh with metro nearby', 'is {city} good for property investment 2026'],
    competitors: ['Large developer brands', 'Listing portals', 'Local brokers'],
    visual: { direction: 'architectural photography, golden hour, clean lines, wide angle, aspirational but real', palette: ['#D8B26E', '#1F2933', '#F6F3EC', '#4B7F6A'], subjects: ['building elevation', 'living room wide shot', 'amenity area', 'location map graphic'] },
    kpis: ['Qualified leads', 'Site visits booked', 'Visit → booking %', 'Cost per site visit'],
  }),
  ecommerce: P({
    label: 'E-commerce / D2C / Fashion',
    detect: ['shop', 'store', 'ecommerce', 'd2c', 'fashion', 'clothing', 'jewellery', 'cosmetics', 'brand', 'ऑनलाइन स्टोर'],
    audience: [
      { segment: 'Style-first 18–30', pains: ['size/fit doubt', 'duplicate products'], desires: ['unique drop', 'easy returns'] },
      { segment: 'Gift buyers', pains: ['-time delivery', 'packaging'], desires: ['ready-to-gift', 'fast shipping'] },
      { segment: 'Repeat loyalists', pains: ['boring repeat catalogue'], desires: ['early access', 'loyalty perks'] },
    ],
    pains: ['cart abandonment', 'rising CAC', 'return rate'],
    desires: ['repeat purchase', 'UGC content', 'higher AOV'],
    usp: ['Easy 7-day returns', 'COD + free shipping over ₹999', 'Limited drops', 'Real customer photos'],
    primary: ['buy {industry} online', '{brand} collection', 'best {industry} india', '{industry} under 999'],
    secondary: ['{industry} for gifting', 'trending {industry} 2026', 'cotton {industry} online', '{industry} reviews'],
    longTail: ['where to buy affordable handmade {industry} online in india', 'best {industry} for daily use with free returns'],
    competitors: ['Marketplace giants', 'Instagram-only labels', 'Discount aggregators'],
    visual: { direction: 'editorial product-on-model shots, crisp shadow, colour-blocked backdrop, generous negative space for text', palette: ['#FF5C8A', '#7C5CFF', '#FFF8F0', '#101014'], subjects: ['hero product flatlay', 'model wearing product', 'unboxing detail', 'UGC mirror selfie'] },
    kpis: ['ROAS', 'AOV', 'Cart abandonment %', 'Repeat purchase rate'],
  }),
  education: P({
    label: 'Education / Coaching / EdTech',
    detect: ['coaching', 'academy', 'course', 'classes', 'school', 'institute', 'tutor', 'edtech', 'कोचिंग'],
    audience: [
      { segment: 'Students 15–24', pains: ['confusing syllabus', 'motivation'], desires: ['clear rank/score', 'doubt support'] },
      { segment: 'Parents', pains: ['fees vs outcome', 'safety'], desires: ['track record', 'regular reports'] },
      { segment: 'Working upskillers', pains: ['time nahi'], desires: ['weekend batches', 'placement help'] },
    ],
    pains: ['admission season pressure', 'demo class drop-off', 'fee objections'],
    desires: ['full batches', 'result stories', 'parent referrals'],
    usp: ['Small batches (max 25)', 'Weekly parent report', 'Free demo + aptitude test', 'Result-backed faculty'],
    primary: ['best {industry} coaching {city}', '{brand} course fees', 'online classes for {industry}', 'coaching near me'],
    secondary: ['{industry} batch schedule', '{industry} syllabus 2026', 'topper interview', 'scholarship test {city}'],
    longTail: ['best weekend {industry} coaching in {city} with fees under 20000', 'how to prepare for {industry} in 6 months'],
    competitors: ['National test-prep chains', 'YouTube/free content', 'Local star teachers'],
    visual: { direction: 'bright classrooms, real students, focused expressions, bold result-number overlays', palette: ['#2F6BFF', '#FFCC29', '#F4F7FF', '#0A1631'], subjects: ['teacher explaining', 'student solving', 'result celebration', 'batch photo'] },
    kpis: ['Demo registrations', 'Demo → admission %', 'Cost per admission', 'Parent referral %'],
  }),
  saas: P({
    label: 'SaaS / Tech / Agency',
    detect: ['saas', 'software', 'app', 'tech', 'startup', 'ai', 'agency', 'platform', 'it services'],
    audience: [
      { segment: 'Decision makers (Founder/CMO)', pains: ['tool sprawl', 'slow reporting'], desires: ['one dashboard', 'measurable ROI'] },
      { segment: 'Ops / managers', pains: ['manual repetitive kaam'], desires: ['automation', 'fewer errors'] },
      { segment: 'Evaluators / IT', pains: ['security & integration'], desires: ['docs', 'sandbox'] },
    ],
    pains: ['long sales cycle', 'demo no-shows', 'feature-heavy messaging'],
    desires: ['qualified pipeline', 'shorter trials', 'case studies'],
    usp: ['Setup in 10 minutes', 'No-code workflows', 'Human support in 5 minutes', 'Pay for outcomes, not seats'],
    primary: ['{industry} software', 'best {industry} tool', '{brand} pricing', '{industry} automation'],
    secondary: ['{industry} for small teams', '{industry} alternatives', 'free {industry} trial', '{industry} integration'],
    longTail: ['best {industry} software for small marketing teams in india 2026', 'how to automate {industry} without code'],
    competitors: ['Incumbent enterprise suites', 'Cheap point tools', 'In-house spreadsheets'],
    visual: { direction: 'dark UI mockups on gradient, crisp data viz, glassmorphism, minimal geometric shapes', palette: ['#7C5CFF', '#B8FF3C', '#0B0D12', '#EDF0F7'], subjects: ['dashboard UI', 'workflow diagram', 'team using laptop', 'metric growth chart'] },
    kpis: ['MQL → SQL %', 'Trial activation', 'CAC payback', 'Net revenue retention'],
  }),
  beauty: P({
    label: 'Salon / Beauty / Wellness',
    detect: ['salon', 'beauty', 'spa', 'makeup', 'hair', 'nail', 'barber', 'सैलून'],
    audience: [
      { segment: 'Occasion-ready 20–35', pains: ['last-minute slots', 'trust on hygiene'], desires: ['look reference match', 'same-day slot'] },
      { segment: 'Regular self-care', pains: ['membership confusion'], desires: ['packages', 'known stylist'] },
      { segment: 'Bridal / family', pains: ['trial quality'], desires: ['portfolio proof', 'on-time delivery'] },
    ],
    pains: ['empty weekdays', 'price comparison', 'stylist churn'],
    desires: ['repeat appointments', 'package sales', 'Instagram reach'],
    usp: ['Free consultation + skin/hair test', 'Bridal trial included', 'Hygiene-first certified', 'Membership with real savings'],
    primary: ['salon near me', 'best makeup artist {city}', '{brand} salon', 'bridal package {city}'],
    secondary: ['hair treatment cost {city}', 'unisex salon near me', 'nail art {city}', 'bridal makeup price'],
    longTail: ['best bridal makeup artist in {city} with trial and home service', 'keratin treatment price near me for short hair'],
    competitors: ['Chain salons', 'Freelance artists', 'Home-service apps'],
    visual: { direction: 'soft beauty light, before/after transformations, textures, elegant minimal props', palette: ['#F4A9C0', '#8B5CF6', '#FFF5F8', '#1A1020'], subjects: ['transformation split', 'artist at work', 'finished look portrait', 'product flatlay'] },
    kpis: ['Bookings / week', 'Package conversion', 'Rebooking rate', 'Instagram saves'],
  }),
  travel: P({
    label: 'Travel / Tours / Hospitality',
    detect: ['travel', 'tour', 'trip', 'holiday', 'hotel', 'resort', 'visa', 'यात्रा'],
    audience: [
      { segment: 'Couples & honeymooners', pains: ['planning stress'], desires: ['curated + photogenic', 'safety'] },
      { segment: 'Families / groups', pains: ['budget + logistics'], desires: ['all-inclusive', 'kid-friendly'] },
      { segment: 'Solo / weekend travellers', pains: ['fixed dates'], desires: ['flexible deals', 'local experiences'] },
    ],
    pains: ['seasonality', 'high cancellation', 'comparison on price'],
    desires: ['direct bookings', 'off-season occupancy', 'UGC reels'],
    usp: ['Local on-ground team', 'Customisable itinerary', 'No hidden charges', 'Free cancellation window'],
    primary: ['{city} tour package', 'best {industry} deals', '{brand} holiday package', 'weekend getaway near me'],
    secondary: ['{industry} itinerary 5 days', 'honeymoon package under 50000', 'visa assistance {city}', 'group tour discount'],
    longTail: ['customisable 4 night {industry} package with flights from {city}', 'safe solo travel itinerary for beginners'],
    competitors: ['OTA giants', 'Instagram travel pages', 'Local agents'],
    visual: { direction: 'aspirational landscape, cinematic wide angle, traveller in frame, golden/blue hour', palette: ['#22B8CF', '#F6C453', '#0A2230', '#FFFFFF'], subjects: ['destination wide shot', 'traveller moment', 'itinerary map', 'room with a view'] },
    kpis: ['Enquiry → booking %', 'Cost per enquiry', 'Off-season occupancy', 'Review score'],
  }),
  finance: P({
    label: 'Finance / Insurance / Consulting',
    detect: ['finance', 'loan', 'insurance', 'ca', 'tax', 'investment', 'consultant', 'accounting', 'वित्त'],
    audience: [
      { segment: 'Salaried 25–45', pains: ['jargon', 'paperwork'], desires: ['clarity', 'fast approval'] },
      { segment: 'SME owners', pains: ['compliance deadlines'], desires: ['one point of contact', 'predictable fee'] },
      { segment: 'HNI / planners', pains: ['trust & confidentiality'], desires: ['data-backed advice', 'long-term view'] },
    ],
    pains: ['low trust', 'long documentation', 'price-only comparison'],
    desires: ['qualified consultations', 'retained clients', 'referral network'],
    usp: ['Fixed-fee, no surprises', 'Dedicated advisor', 'Digital documents in 24h', 'Free clarity call'],
    primary: ['{industry} advisor {city}', 'best {industry} service near me', '{brand} consultation', 'tax filing help'],
    secondary: ['{industry} charges', 'how to choose {industry}', 'online {industry} india', '{industry} checklist'],
    longTail: ['fixed fee {industry} consultant for small businesses in {city}', 'documents required for {industry} in 2026'],
    competitors: ['Big banks / institutions', 'Aggregator marketplaces', 'Independent local advisors'],
    visual: { direction: 'trust-forward corporate minimalism, calm blues, real advisor portraits, clean data cards', palette: ['#1F6FEB', '#9AD8C2', '#F5F8FC', '#0A1628'], subjects: ['advisor conversation', 'document checklist', 'growth chart', 'client testimonial card'] },
    kpis: ['Qualified consultations', 'Consult → retain %', 'Cost per lead', 'Referral rate'],
  }),
};

export function detectIndustry(text = '') {
  const t = String(text).toLowerCase();
  for (const [key, preset] of Object.entries(INDUSTRIES)) {
    if (key === 'generic') continue;
    if (preset.detect.some((d) => t.includes(d))) return { key, preset };
  }
  return { key: 'generic', preset: INDUSTRIES.generic };
}

/* ------------------------------------------------------------------ */
/* multilingual copy banks                                            */
/* ------------------------------------------------------------------ */

export const COPY_BANK = {
  hinglish: {
    hooks: [
      '{pain}? {brand} ne isse 30 din me solve kiya.',
      'Sach bolein: {desire} ke liye aapko aur kuch try karne ki zarurat nahi.',
      '{city} me {industry} dhundh rahe ho? Pehle ye dekho.',
      'Har koi bolta hai "best". Hum proof dikhate hain.',
      '{brand} par aapka pehla step bilkul free hai. Risk zero.',
      'Itna simple ki aaj hi shuru kar sakte ho — {brand}.',
    ],
    primary: [
      '{pain} se pareshan? {brand} me milta hai {desire} — bina jhanjhat ke. Aaj hi {offer} claim karo, {city} ke customers pehle se choose kar rahe hain. Limited slots, CTA dabao.',
      'Humne 100+ customers se poocha: sabko chahiye tha {desire}. Isliye {brand} banaya — {usp}. Free consultation ke liye abhi message karo.',
      'Koi hidden charges nahi, koi lamba wait nahi. Sirf clear kaam aur real results. {brand} ka {offer} sirf is hafte. Book karo, baad me socho nahi.',
    ],
    ctas: ['Abhi book karo', 'Free demo lo', 'WhatsApp pe baat karo', 'Offer claim karo', 'Slot reserve karo', 'Aaj hi shuru karo'],
    headlines: ['{desire}, bina jhanjhat', '{city} ka trusted {industry}', '{brand} · {offer}', 'Pehla step free hai'],
    descriptions: ['Real results. Clear pricing. Zero drama.', 'Aaj hi shuru karo, 2 minute me.', '100+ happy customers ka bharosa.'],
    hashtags: ['#{brandclean}', '#{industryclean}', '#{cityclean}', '#DigitalIndia', '#SmallBusiness', '#AajHiShuruKaro'],
    outreachSubject: '{brand} ke liye 3 quick growth gaps (2 min me dekhiye)',
    outreachBody: 'Hi {brand} team,\n\nMaine aapka online presence quickly scan kiya aur 3 jagah dekhi jahan leads nikal rahe hain: {pain}, {pain2} aur clear CTA na hona.\n\nEk chhota 1-page audit banakar bhej sakta hoon — free, koi pitch nahi. Interested ho to ek "yes" reply kaafi hai.\n\n— FailureAI se bheja gaya',
    disclaimer: 'Yeh demo/local-engine output hai. Live AI mode me yahi sections real model se aate hain — Settings me API key daalein.',
  },
  hindi: {
    hooks: [
      '{pain}? {brand} ने इसे 30 दिनों में सुलझाया।',
      'सीधी बात: {desire} के लिए अब और कोशिश की ज़रूरत नहीं।',
      '{city} में {industry} ढूंढ रहे हैं? पहले ये देखिए।',
      'सब "बेस्ट" बोलते हैं, हम नतीजे दिखाते हैं।',
      '{brand} पर पहला कदम बिलकुल मुफ़्त है। जोखिम शून्य।',
      'इतना आसान कि आज ही शुरू कर सकते हैं — {brand}।',
    ],
    primary: [
      '{pain} से परेशान? {brand} में मिलता है {desire} — बिना झंझट के। आज ही {offer} लें, {city} के ग्राहक पहले से चुन रहे हैं। सीमित स्लॉट, अभी बुक कीजिए।',
      'हमने 100+ ग्राहकों से पूछा: सब चाहते थे {desire}। इसलिए {brand} बनाया — {usp}। मुफ़्त सलाह के लिए अभी संदेश भेजिए।',
      'कोई छुपा शुल्क नहीं, कोई लंबा इंतज़ार नहीं। सिर्फ़ साफ़ काम और असली नतीजे। {brand} का {offer} इसी सप्ताह।',
    ],
    ctas: ['अभी बुक करें', 'मुफ़्त डेमो लें', 'WhatsApp पर बात करें', 'ऑफ़र लें', 'स्लॉट रिज़र्व करें', 'आज ही शुरू करें'],
    headlines: ['{desire}, बिना झंझट', '{city} का भरोसेमंद {industry}', '{brand} · {offer}', 'पहला कदम मुफ़्त है'],
    descriptions: ['असली नतीजे। साफ़ कीमत। कोई ड्रामा नहीं।', '2 मिनट में शुरू करें।', '100+ खुश ग्राहकों का भरोसा।'],
    hashtags: ['#{brandclean}', '#{industryclean}', '#{cityclean}', '#डिजिटलइंडिया', '#छोटाव्यापार', '#आजहीशुरूकरें'],
    outreachSubject: '{brand} के लिए 3 तेज़ ग्रोथ गैप (2 मिनट में देखिए)',
    outreachBody: 'नमस्ते {brand} टीम,\n\nमैंने आपकी ऑनलाइन उपस्थिति देखी और 3 जगहें मिलीं जहाँ लीड निकल रही हैं: {pain}, {pain2} और स्पष्ट CTA न होना।\n\nएक छोटा 1-पेज ऑडिट मुफ़्त भेज सकता हूँ — बिना किसी पिच के। चाहिए तो सिर्फ़ "हाँ" लिख दीजिए।\n\n— FailureAI से भेजा गया',
    disclaimer: 'यह डेमो / लोकल-इंजन आउटपुट है। लाइव AI मोड में यही हिस्से वास्तविक मॉडल से आते हैं — Settings में API key डालें।',
  },
  english: {
    hooks: [
      'Still dealing with {pain}? {brand} fixed it in 30 days.',
      'Straight talk: you do not need another workaround to get {desire}.',
      'Searching for {industry} in {city}? Start here.',
      'Everyone says "best". We show the proof.',
      'Your first step with {brand} is free. Zero risk.',
      'Simple enough to start today — {brand}.',
    ],
    primary: [
      'Tired of {pain}? {brand} delivers {desire} without the runaround. Claim {offer} today — customers across {city} already have. Limited slots, book now.',
      'We asked 100+ customers what they wanted: {desire}. So we built {brand} around {usp}. Message us for a free consultation.',
      'No hidden fees, no long waitlists. Just clear work and real results. {brand} is offering {offer} this week only.',
    ],
    ctas: ['Book now', 'Get a free demo', 'Chat on WhatsApp', 'Claim the offer', 'Reserve a slot', 'Get started today'],
    headlines: ['{desire}, minus the hassle', '{city}’s trusted {industry}', '{brand} · {offer}', 'Your first step is free'],
    descriptions: ['Real results. Clear pricing. Zero drama.', 'Get started in 2 minutes.', 'Trusted by 100+ happy customers.'],
    hashtags: ['#{brandclean}', '#{industryclean}', '#{cityclean}', '#DigitalMarketing', '#SmallBusiness', '#GetStartedToday'],
    outreachSubject: '3 quick growth gaps I spotted for {brand} (2-min read)',
    outreachBody: 'Hi {brand} team,\n\nI did a quick scan of your online presence and found 3 places leads are leaking: {pain}, {pain2} and no clear CTA above the fold.\n\nHappy to send a free 1-page audit — no pitch attached. Just reply "yes" and it is yours.\n\n— Sent via FailureAI',
    disclaimer: 'This is local-engine demo output. In Live AI mode the same sections come from a real model — add an API key in Settings.',
  },
};

export const IDEA_BANK = [
  { format: 'Reel / Short', idea: 'Ek myth todho: "log kya sochte hain" vs "sach kya hai"', channel: 'Instagram' },
  { format: 'Carousel', idea: '5-step checklist jo audience save kare', channel: 'Instagram' },
  { format: 'Static proof post', idea: 'Real customer result / testimonial with number', channel: 'Meta' },
  { format: 'Before / After', idea: 'Transformation with one clear caption', channel: 'Instagram' },
  { format: 'Founder video', idea: '60 sec: kyun shuru kiya, kis problem ke liye', channel: 'LinkedIn' },
  { format: 'Poll / Q&A', idea: 'Audience se ek pain point poocho, comments me solve karo', channel: 'Instagram' },
  { format: 'Blog / SEO post', idea: 'High-intent long-tail keyword par 800-word guide', channel: 'Website' },
  { format: 'Offer post', idea: 'Limited-time offer + deadline + single CTA', channel: 'Meta' },
  { format: 'Behind the scenes', idea: 'Process, team, packaging ya delivery dikhao', channel: 'Instagram' },
  { format: 'Comparison', idea: 'Hum vs generic option — honest, no namecalling', channel: 'LinkedIn' },
  { format: 'Email / WhatsApp', idea: 'Segmented re-engagement with a useful tip', channel: 'WhatsApp' },
  { format: 'Live / Webinar', idea: 'Free 20-min Q&A, end par soft CTA', channel: 'YouTube' },
  { format: 'UGC repost', idea: 'Customer ki story repost karo with caption', channel: 'Instagram' },
  { format: 'How-to graphic', idea: 'Ek chhota tutorial jo audience forward kare', channel: 'Meta' },
  { format: 'Case study', idea: 'Problem → action → number-driven result', channel: 'LinkedIn' },
];

export const normalizeContext = (raw = {}) => {
  const query = String(raw.query ?? '').trim().slice(0, 240);
  const url = String(raw.url ?? (/^https?:\/\//i.test(query) ? query : '')).trim().slice(0, 300);
  const brand = String(raw.brand ?? '').trim() || brandFrom(query || url || 'Aapka Brand');
  const language = LANGUAGES.includes(raw.language) ? raw.language : 'hinglish';
  const tone = TONES.includes(raw.tone) ? raw.tone : 'bold';
  const goal = GOALS.includes(raw.goal) ? raw.goal : 'leads';
  const city = String(raw.city ?? '').trim().slice(0, 60) || 'aapke sheher';
  const offer = String(raw.offer ?? '').trim().slice(0, 120) || 'free consultation & 7-day trial';
  const audience = String(raw.audience ?? '').trim().slice(0, 160);
  const notes = String(raw.notes ?? '').trim().slice(0, 500);
  const platforms = Array.isArray(raw.platforms) && raw.platforms.length ? raw.platforms.slice(0, 6) : ['meta', 'google', 'instagram', 'linkedin', 'whatsapp'];
  const research = Array.isArray(raw.research) ? raw.research.slice(0, 8).map((r) => ({
    title: String(r.title ?? '').slice(0, 180),
    url: String(r.url ?? '').slice(0, 300),
    snippet: String(r.snippet ?? '').slice(0, 400),
  })) : [];
  const explicitIndustry = String(raw.industry ?? '').trim();
  const detected = detectIndustry(`${query} ${notes} ${audience} ${explicitIndustry} ${brand}`);
  const industry = explicitIndustry && explicitIndustry !== 'auto' ? explicitIndustry : detected.preset.label;
  const industryKey = detected.key;
  return {
    query, url, brand, language, tone, goal, city, offer, audience, notes,
    platforms, research, industry, industryKey,
    preset: detected.preset,
    seed: hash(`${brand}|${query}|${tone}|${goal}|${language}`),
    webResearchEnabled: Boolean(raw.webResearchEnabled),
  };
};
