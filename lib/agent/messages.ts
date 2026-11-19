import { BUSINESS } from '../catalog';
import { formatDate, formatMoney } from '../date';
import { frequencyLabel } from '../schedule';
import type { Lang, Product } from '../types';
import { pick } from './lang';

export function productLabel(product: Product, lang: Lang): string {
  return lang === 'hindi' ? product.nameHi : product.name;
}

const UNIT_HINDI: Record<string, string> = {
  litre: 'लीटर',
  kg: 'किलो',
  g: 'ग्राम',
  packet: 'पैकेट',
};

export function qtyLabel(qty: number, unit: string, lang: Lang = 'english'): string {
  const nice = Number.isInteger(qty) ? String(qty) : String(qty);
  const label = lang === 'hindi' ? UNIT_HINDI[unit] ?? unit : unit;
  return `${nice} ${label}`;
}

export function orderRef(id: string): string {
  return `#${id.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase()}`;
}

export function priceList(products: Product[], lang: Lang): string {
  const lines = products.map((p) => `• ${productLabel(p, lang)} — ${formatMoney(p.price)}/${p.unit}`);
  return pick(lang, {
    hinglish: `📋 *${BUSINESS.name} price list*\n${lines.join('\n')}\n\n🕔 Delivery roz ${BUSINESS.deliveryWindow}, order ${BUSINESS.cutoff} tak.\nOrder karna ho to likh dein — "2 litre doodh roz"`,
    hindi: `📋 *${BUSINESS.name} प्राइस लिस्ट*\n${lines.join('\n')}\n\n🕔 डिलीवरी रोज़ ${BUSINESS.deliveryWindow}, ऑर्डर ${BUSINESS.cutoff} तक।\nऑर्डर के लिए लिखें — "2 लीटर दूध रोज़"`,
    english: `📋 *${BUSINESS.name} price list*\n${lines.join('\n')}\n\n🕔 Delivery daily ${BUSINESS.deliveryWindow}, order by ${BUSINESS.cutoff}.\nTo order, just type — "2 litre milk daily"`,
  });
}

export function greeting(name: string | null, lang: Lang): string {
  const who = name ? ` ${name.split(' ')[0]}` : '';
  return pick(lang, {
    hinglish: `Namaste${who} ji 🙏 *${BUSINESS.name}* me swagat hai!\n\nRoz subah ${BUSINESS.deliveryWindow} fresh doodh, dahi, paneer ghar tak.\nAap bas likh dein:\n• "2 litre doodh roz"\n• "kal se 1 litre buffalo milk"\n• "kal band" (chutti) · "bill kitna hai"`,
    hindi: `नमस्ते${who} जी 🙏 *${BUSINESS.name}* में स्वागत है!\n\nरोज़ सुबह ${BUSINESS.deliveryWindow} ताज़ा दूध, दही, पनीर घर तक।\nआप लिख दीजिए:\n• "2 लीटर दूध रोज़"\n• "कल से 1 लीटर भैंस का दूध"\n• "कल बंद" (छुट्टी) · "बिल कितना है"`,
    english: `Hello${who} 🙏 Welcome to *${BUSINESS.name}*!\n\nFresh milk, curd and paneer delivered daily ${BUSINESS.deliveryWindow}.\nJust type:\n• "2 litre milk daily"\n• "1 litre buffalo milk from tomorrow"\n• "pause tomorrow" · "what's my bill"`,
  });
}

export function askProduct(lang: Lang): string {
  return pick(lang, {
    hinglish: 'Kaunsa product chahiye? Hamare paas Cow Milk, Buffalo Milk, Curd, Paneer, Ghee aur Buttermilk hai.\nJaise: "1 litre cow milk roz"',
    hindi: 'कौन सा प्रोडक्ट चाहिए? हमारे पास गाय का दूध, भैंस का दूध, दही, पनीर, घी और छाछ है।\nजैसे: "1 लीटर गाय का दूध रोज़"',
    english: 'Which product would you like? We have Cow Milk, Buffalo Milk, Curd, Paneer, Ghee and Buttermilk.\nFor example: "1 litre cow milk daily"',
  });
}

export function askQty(product: Product, lang: Lang): string {
  return pick(lang, {
    hinglish: `Kitna ${productLabel(product, 'hinglish')} chahiye? Jaise: "1 ${product.unit}" ya "2 ${product.unit}".`,
    hindi: `कितना ${productLabel(product, 'hindi')} चाहिए? जैसे: "1 ${product.unit}" या "2 ${product.unit}"।`,
    english: `How much ${product.name} would you like? e.g. "1 ${product.unit}" or "2 ${product.unit}".`,
  });
}

export interface OrderConfirmation {
  orderId: string;
  product: Product;
  qty: number;
  frequency: 'daily' | 'alternate' | 'weekly' | 'once';
  startDate: string;
  amountPerDay: number;
  address: string | null;
  lang: Lang;
  customerName: string | null;
}

export function orderConfirmed(o: OrderConfirmation): string {
  const { lang } = o;
  const pname = productLabel(o.product, lang);
  const dayAmount = formatMoney(o.amountPerDay);
  const monthly = formatMoney(o.amountPerDay * 30);
  const when = formatDate(o.startDate, lang);
  const freq = frequencyLabel(o.frequency, lang);
  const ref = orderRef(o.orderId);
  const qty = qtyLabel(o.qty, o.product.unit, lang);
  const schedule =
    o.frequency === 'once'
      ? pick(lang, {
          hinglish: `sirf ${when}`,
          hindi: `सिर्फ़ ${when}`,
          english: `one time on ${when}`,
        })
      : pick(lang, {
          hinglish: `${freq}, ${when} se`,
          hindi: `${freq}, ${when} से`,
          english: `${freq}, from ${when}`,
        });

  const addrLine = o.address
    ? pick(lang, {
        hinglish: `📍 Delivery: ${o.address}`,
        hindi: `📍 पता: ${o.address}`,
        english: `📍 Address: ${o.address}`,
      })
    : pick(lang, {
        hinglish: '📍 Address bhej dein (building/flat) taaki delivery me dikkat na ho.',
        hindi: '📍 कृपया पता भेज दें (बिल्डिंग/फ्लैट) ताकि डिलीवरी में दिक्कत न हो।',
        english: '📍 Please share your address (building/flat) so delivery is smooth.',
      });

  const totalLine =
    o.frequency === 'once'
      ? pick(lang, {
          hinglish: `💰 Total ${dayAmount}`,
          hindi: `💰 कुल ${dayAmount}`,
          english: `💰 Total ${dayAmount}`,
        })
      : pick(lang, {
          hinglish: `💰 ${dayAmount}/din · mahine ka approx ${monthly}`,
          hindi: `💰 ${dayAmount}/दिन · महीने का लगभग ${monthly}`,
          english: `💰 ${dayAmount}/day · about ${monthly} per month`,
        });

  return pick(lang, {
    hinglish: `✅ Order confirm — ${ref}\n\n🥛 ${pname} — ${qty}\n🔁 ${schedule}\n${totalLine}\n${addrLine}\n\nKuch change karna ho to bas likh dein — "kal band", "1 litre karo" ya "cancel".`,
    hindi: `✅ ऑर्डर कन्फर्म — ${ref}\n\n🥛 ${pname} — ${qty}\n🔁 ${schedule}\n${totalLine}\n${addrLine}\n\nकुछ बदलना हो तो लिख दें — "कल बंद", "1 लीटर करो" या "cancel"।`,
    english: `✅ Order confirmed — ${ref}\n\n🥛 ${pname} — ${qty}\n🔁 ${schedule}\n${totalLine}\n${addrLine}\n\nAnything to change? Just type — "pause tomorrow", "make it 1 litre" or "cancel".`,
  });
}

export function pauseConfirmed(
  from: string,
  to: string,
  days: number,
  resumeDate: string,
  lang: Lang
): string {
  return pick(lang, {
    hinglish: `Theek hai 🙏 ${formatDate(from, lang)} se ${formatDate(to, lang)} tak delivery pause kar di (${days} din).\nIs period ka koi charge nahi lagega. Wapas chahiye to "start" likh dein — delivery ${formatDate(resumeDate, lang)} se phir shuru ho jayegi.`,
    hindi: `ठीक है 🙏 ${formatDate(from, lang)} से ${formatDate(to, lang)} तक डिलीवरी पॉज़ कर दी (${days} दिन)।\nइन दिनों का कोई चार्ज नहीं लगेगा। वापस चाहिए तो "start" लिख दें — डिलीवरी ${formatDate(resumeDate, lang)} से फिर शुरू हो जाएगी।`,
    english: `Done 🙏 Delivery paused from ${formatDate(from, lang)} to ${formatDate(to, lang)} (${days} day${days > 1 ? 's' : ''}).\nNo charge for these days. Type "start" anytime and delivery resumes on ${formatDate(resumeDate, lang)}.`,
  });
}

export function noActiveOrder(lang: Lang): string {
  return pick(lang, {
    hinglish: 'Abhi aapki koi active delivery nahi hai. Shuru karni ho to likh dein — "1 litre doodh roz".',
    hindi: 'अभी आपकी कोई चालू डिलीवरी नहीं है। शुरू करनी हो तो लिखें — "1 लीटर दूध रोज़"।',
    english: 'You have no active delivery right now. To start one, type — "1 litre milk daily".',
  });
}

export function resumed(nextDate: string, summary: string, lang: Lang): string {
  return pick(lang, {
    hinglish: `✅ Delivery phir se shuru!\n${summary}\n\nNext delivery: *${formatDate(nextDate, lang)}*. Pause karna ho to "kal band" likh dena.`,
    hindi: `✅ डिलीवरी फिर से शुरू!\n${summary}\n\nअगली डिलीवरी: *${formatDate(nextDate, lang)}*। रोकना हो तो "कल बंद" लिख दें।`,
    english: `✅ Delivery restarted!\n${summary}\n\nNext delivery: *${formatDate(nextDate, lang)}*. Type "pause tomorrow" whenever needed.`,
  });
}

export function cancelled(lang: Lang): string {
  return pick(lang, {
    hinglish: 'Order cancel kar diya ✅ Aage koi delivery nahi aayegi. Wapas shuru karna ho to "start" likh dena — main dobara set kar dunga.',
    hindi: 'ऑर्डर कैंसिल कर दिया ✅ आगे कोई डिलीवरी नहीं आएगी। वापस शुरू करना हो तो "start" लिख दें।',
    english: 'Order cancelled ✅ No more deliveries for now. Type "start" whenever you want to resume.',
  });
}

export interface DueSummary {
  amount: number;
  count: number;
  oldest?: string;
}

export function dues(d: DueSummary, lang: Lang, name: string | null): string {
  if (d.amount <= 0) {
    return pick(lang, {
      hinglish: `Hisab clear hai ✅ ${name ? name.split(' ')[0] + ' ji, ' : ''}koi payment pending nahi. Dhanyavad!`,
      hindi: `हिसाब क्लियर है ✅ ${name ? name.split(' ')[0] + ' जी, ' : ''}कोई पेमेंट बाकी नहीं। धन्यवाद!`,
      english: `All clear ✅ ${name ? name.split(' ')[0] + ', ' : ''}no pending payment. Thank you!`,
    });
  }
  return pick(lang, {
    hinglish: `📒 ${name ? name.split(' ')[0] + ' ji, ' : ''}abhi *${formatMoney(d.amount)}* pending hai (${d.count} delivery ka).\n${d.oldest ? `Sabse purani: ${formatDate(d.oldest, lang)}\n` : ''}UPI: ${BUSINESS.upi} — ya delivery boy ko cash de sakte hain.`,
    hindi: `📒 ${name ? name.split(' ')[0] + ' जी, ' : ''}अभी *${formatMoney(d.amount)}* बाकी है (${d.count} डिलीवरी का)।\n${d.oldest ? `सबसे पुरानी: ${formatDate(d.oldest, lang)}\n` : ''}UPI: ${BUSINESS.upi} — या डिलीवरी बॉय को कैश दे सकते हैं।`,
    english: `📒 ${name ? name.split(' ')[0] + ', ' : ''}you have *${formatMoney(d.amount)}* pending (${d.count} deliver${d.count > 1 ? 'ies' : 'y'}).\n${d.oldest ? `Oldest: ${formatDate(d.oldest, lang)}\n` : ''}UPI: ${BUSINESS.upi} or cash to the delivery person.`,
  });
}

export function orderStatus(
  items: Array<{ product: Product; qty: number; unit: string; price: number; frequency: string }>,
  nextDate: string | null,
  lang: Lang
): string {
  if (items.length === 0) return noActiveOrder(lang);
  const lines = items.map(
    (i) =>
      `• ${productLabel(i.product, lang)} — ${qtyLabel(i.qty, i.unit, lang)}, ${i.frequency} (${formatMoney(i.price)}${lang === 'english' ? '/day' : '/din'})`
  );
  const next = nextDate
    ? pick(lang, {
        hinglish: `\n\nNext delivery: *${formatDate(nextDate, lang)}*`,
        hindi: `\n\nअगली डिलीवरी: *${formatDate(nextDate, lang)}*`,
        english: `\n\nNext delivery: *${formatDate(nextDate, lang)}*`,
      })
    : '';
  return pick(lang, {
    hinglish: `Aapki active delivery:\n${lines.join('\n')}${next}`,
    hindi: `आपकी चालू डिलीवरी:\n${lines.join('\n')}${next}`,
    english: `Your active delivery:\n${lines.join('\n')}${next}`,
  });
}

export function complaintLogged(id: string, lang: Lang, name: string | null): string {
  const who = name ? ` ${name.split(' ')[0]} ji` : '';
  return pick(lang, {
    hinglish: `Sorry${who} 😔 Complaint note kar li (${id}) aur owner ko bhej di.\nAaj ki delivery adjust kar denge, kal se dhyan rakhenge. Owner aapko call karenge — kya abhi call kar lein?`,
    hindi: `माफ़ कीजिए${who} 😔 शिकायत नोट कर ली (${id}) और ओनर को भेज दी।\nआज की डिलीवरी एडजस्ट कर देंगे, कल से ध्यान रखेंगे। ओनर आपको कॉल करेंगे — अभी कॉल कर लें?`,
    english: `Sorry${who} 😔 I've logged your complaint (${id}) and alerted the owner.\nWe'll adjust today's delivery and be careful from tomorrow. Want a call back now?`,
  });
}

export function handoff(lang: Lang): string {
  return pick(lang, {
    hinglish: `Ji bilkul — owner (${BUSINESS.phone}) aapko 10 minute me call karenge 🙏\nTab tak kuch aur chahiye to bata dein.`,
    hindi: `जी बिल्कुल — ओनर (${BUSINESS.phone}) आपको 10 मिनट में कॉल करेंगे 🙏\nतब तक कुछ और चाहिए तो बता दें।`,
    english: `Sure — the owner (${BUSINESS.phone}) will call you within 10 minutes 🙏\nAnything else I can help with meanwhile?`,
  });
}

export function addressSaved(addr: string, lang: Lang): string {
  return pick(lang, {
    hinglish: `📍 Address save ho gaya: ${addr}\nAb delivery isi address par jayegi. Kuch aur chahiye?`,
    hindi: `📍 पता सेव हो गया: ${addr}\nअब डिलीवरी इसी पते पर जाएगी। कुछ और चाहिए?`,
    english: `📍 Address saved: ${addr}\nDeliveries will go here from now on. Anything else?`,
  });
}

export function thanks(lang: Lang): string {
  return pick(lang, {
    hinglish: 'Anytime ji 🙏 Kuch aur chahiye to bas message kar dena.',
    hindi: 'कभी भी जी 🙏 कुछ और चाहिए तो मैसेज कर दें।',
    english: 'Anytime 🙏 Message me whenever you need anything.',
  });
}

export function fallback(lang: Lang): string {
  return pick(lang, {
    hinglish: 'Samajh nahi aaya 🤔 Aap ye try kar sakte hain:\n• "2 litre doodh roz"\n• "kal band" / "start"\n• "bill kitna hai"\n• "complaint" — doodh ki quality\nYa "owner" likh dein, wo call kar lenge.',
    hindi: 'समझ नहीं आया 🤔 आप ये लिख सकते हैं:\n• "2 लीटर दूध रोज़"\n• "कल बंद" / "start"\n• "बिल कितना है"\n• "शिकायत" — दूध की क्वालिटी\nया "owner" लिखें, वो कॉल कर लेंगे।',
    english: `I didn't catch that 🤔 Try:\n• "2 litre milk daily"\n• "pause tomorrow" / "start"\n• "what's my bill"\n• "complaint" — about milk quality\nOr type "owner" and we'll call you.`,
  });
}

export function cancelledPending(lang: Lang): string {
  return pick(lang, {
    hinglish: 'Koi baat nahi, order cancel kar diya ✅ Jab chahiye tab likh dena.',
    hindi: 'कोई बात नहीं, ऑर्डर कैंसिल कर दिया ✅ जब चाहिए तब लिख दें।',
    english: 'No problem, cancelled ✅ Message anytime you want to order.',
  });
}

export function productPrice(product: Product, lang: Lang): string {
  return pick(lang, {
    hinglish: `🥛 ${product.name} — *${formatMoney(product.price)}/${product.unit}*\nDelivery roz ${BUSINESS.deliveryWindow}. Order karna ho to likh dein — "1 ${product.unit} ${product.name.toLowerCase()} roz".`,
    hindi: `🥛 ${product.nameHi} — *${formatMoney(product.price)}/${product.unit}*\nडिलीवरी रोज़ ${BUSINESS.deliveryWindow}। ऑर्डर के लिए लिखें — "1 ${product.unit} ${product.nameHi} रोज़"।`,
    english: `🥛 ${product.name} — *${formatMoney(product.price)}/${product.unit}*\nDelivered daily ${BUSINESS.deliveryWindow}. To order, type "1 ${product.unit} ${product.name.toLowerCase()} daily".`,
  });
}

export function modifyConfirmed(
  product: Product,
  qty: number,
  amountPerDay: number,
  lang: Lang
): string {
  const qtyText = qtyLabel(qty, product.unit, lang);
  return pick(lang, {
    hinglish: `✅ Update ho gaya — ab ${productLabel(product, 'hinglish')} *${qtyText}* roz.\n💰 ${formatMoney(amountPerDay)}/din. Ab se yahi quantity aayegi.`,
    hindi: `✅ अपडेट हो गया — अब ${productLabel(product, 'hindi')} *${qtyText}* रोज़।\n💰 ${formatMoney(amountPerDay)}/दिन। अब से यही क्वांटिटी आएगी।`,
    english: `✅ Updated — ${product.name} is now *${qtyText}* daily.\n💰 ${formatMoney(amountPerDay)}/day. New quantity applies from today.`,
  });
}
