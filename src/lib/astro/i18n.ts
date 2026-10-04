import type { AreaCodes, AvoidKey, HeadlineKey, ModuleKey, Reading } from "./reading";
import { type Graha, KARANAS, NAKSHATRAS, RASHIS, TITHIS, VARAS, YOGAS } from "./constants";
import type { YogaKey } from "./yogas";

export type HoroscopeLang = "en" | "hinglish" | "hi";
export const LANGS: { value: HoroscopeLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hinglish", label: "Hinglish" },
  { value: "hi", label: "हिंदी" },
];

type Tri = Record<HoroscopeLang, string>;
type TriList = Record<HoroscopeLang, readonly string[]>;

// ---------- Names ----------

const RASHI_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];
const NAKSHATRA_HI = [
  "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा", "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वा फाल्गुनी", "उत्तरा फाल्गुनी", "हस्त", "चित्रा",
  "स्वाति", "विशाखा", "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा", "पूर्वा भाद्रपद", "उत्तरा भाद्रपद", "रेवती",
];
const TITHI_HI = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी"];
const YOGA_HI = [
  "विष्कुम्भ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा", "धृति", "शूल", "गण्ड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण",
  "वज्र", "सिद्धि", "व्यतीपात", "वरीयान", "परिघ", "शिव", "सिद्ध", "साध्य", "शुभ", "शुक्ल", "ब्रह्म", "इन्द्र", "वैधृति",
];
const KARANA_HI = ["बव", "बालव", "कौलव", "तैतिल", "गर", "वणिज", "विष्टि (भद्रा)", "शकुनि", "चतुष्पद", "नाग", "किंस्तुघ्न"];
const VARA_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const VARA_HINGLISH = ["Ravivaar", "Somvaar", "Mangalvaar", "Budhvaar", "Guruvaar", "Shukravaar", "Shanivaar"];
const GRAHA: Record<Graha, Tri> = {
  Sun: { en: "Sun", hinglish: "Surya", hi: "सूर्य" },
  Moon: { en: "Moon", hinglish: "Chandra", hi: "चंद्र" },
  Mars: { en: "Mars", hinglish: "Mangal", hi: "मंगल" },
  Mercury: { en: "Mercury", hinglish: "Budh", hi: "बुध" },
  Jupiter: { en: "Jupiter", hinglish: "Guru", hi: "गुरु" },
  Venus: { en: "Venus", hinglish: "Shukra", hi: "शुक्र" },
  Saturn: { en: "Saturn", hinglish: "Shani", hi: "शनि" },
  Rahu: { en: "Rahu", hinglish: "Rahu", hi: "राहु" },
  Ketu: { en: "Ketu", hinglish: "Ketu", hi: "केतु" },
};
const GRAHA_SHORT_HI: Record<Graha, string> = { Sun: "सू", Moon: "चं", Mars: "मं", Mercury: "बु", Jupiter: "गु", Venus: "शु", Saturn: "श", Rahu: "रा", Ketu: "के" };

const TARA_NAMES: TriList = {
  en: ["Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhana", "Naidhana", "Mitra", "Parama Mitra"],
  hinglish: ["Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhana", "Naidhana", "Mitra", "Param Mitra"],
  hi: ["जन्म", "संपत", "विपत", "क्षेम", "प्रत्यक", "साधना", "नैधन", "मित्र", "परम मित्र"],
};

export const names = (lang: HoroscopeLang) => ({
  rashi: (i: number) => (lang === "hi" ? RASHI_HI[i] : lang === "hinglish" ? RASHIS[i].name : `${RASHIS[i].name} · ${RASHIS[i].en}`),
  nakshatra: (i: number) => (lang === "hi" ? NAKSHATRA_HI[i] : NAKSHATRAS[i]),
  tithi: (t: { paksha: "Shukla" | "Krishna"; day: number; number: number }) => {
    if (lang === "hi") {
      const n = t.number === 15 ? "पूर्णिमा" : t.number === 30 ? "अमावस्या" : TITHI_HI[t.day - 1];
      return `${t.paksha === "Shukla" ? "शुक्ल" : "कृष्ण"} ${n}`;
    }
    const n = t.number === 15 ? "Purnima" : t.number === 30 ? "Amavasya" : TITHIS[t.day - 1];
    return `${t.paksha} ${n}`;
  },
  yoga: (i: number) => (lang === "hi" ? YOGA_HI[i] : YOGAS[i]),
  vara: (weekdayName: string) => {
    const i = VARAS.findIndex((v) => v.name === weekdayName);
    return lang === "hi" ? VARA_HI[i] : lang === "hinglish" ? VARA_HINGLISH[i] : VARAS[i].name;
  },
  graha: (g: Graha) => GRAHA[g][lang],
  /** Two-letter chart abbreviation. */
  grahaShort: (g: Graha) => (lang === "hi" ? GRAHA_SHORT_HI[g] : g === "Mercury" ? "Me" : g === "Mars" ? "Ma" : g.slice(0, 2)),
  karana: (i: number) => (lang === "hi" ? KARANA_HI[i] : KARANAS[i] === "Vishti" ? "Vishti (Bhadra)" : KARANAS[i]),
  tara: (i: number) => TARA_NAMES[lang][i],
  /** "7th" / "7th" / "7वाँ" */
  ord: (n: number) =>
    lang === "hi" ? `${n}${n === 1 ? "ला" : n === 2 ? "रा" : n === 3 ? "रा" : n === 4 ? "था" : "वाँ"}` : `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`,
});

// ---------- Reading text ----------

const HEADLINES: Record<HeadlineKey, TriList> = {
  slow: { en: ["Go slow today"], hinglish: ["Aaj dheere chalo"], hi: ["आज धीरे चलें"] },
  strong: {
    en: ["A strong day — use it", "Favourable skies", "Momentum is on your side"],
    hinglish: ["Aaj ka din strong hai — iska fayda uthao", "Sitaare saath hain", "Momentum aapke saath hai"],
    hi: ["आज का दिन मज़बूत है — इसका लाभ उठाएँ", "ग्रह अनुकूल हैं", "गति आपके साथ है"],
  },
  steady: {
    en: ["A steady, workable day", "Quietly good", "Small wins add up today"],
    hinglish: ["Ek steady, kaam ka din", "Chupchaap achha din", "Aaj chhoti jeet bhi kaam aayegi"],
    hi: ["एक स्थिर, काम का दिन", "शांत रूप से अच्छा दिन", "आज छोटी जीतें भी जुड़ेंगी"],
  },
  mixed: {
    en: ["Mixed signals — stay flexible", "An ordinary day; keep it simple", "Balance effort with rest"],
    hinglish: ["Mixed signals — flexible raho", "Normal din hai; simple rakho", "Mehnat aur aaram ka balance rakho"],
    hi: ["मिले-जुले संकेत — लचीले रहें", "सामान्य दिन है; सरल रखें", "मेहनत और आराम में संतुलन रखें"],
  },
  low: {
    en: ["Keep your head down", "Protect your energy today", "Not the day for big moves"],
    hinglish: ["Aaj low profile raho", "Apni energy bachakar rakho", "Bade faisle ka din nahi hai"],
    hi: ["आज सादगी से रहें", "अपनी ऊर्जा बचाकर रखें", "बड़े क़दम उठाने का दिन नहीं है"],
  },
};

const MOON_TEXT: TriList = {
  en: [
    "The Moon passes over your own sign — you feel more like yourself. Good food, rest and small comforts land well.",
    "The Moon sits in your 2nd: spending and sharp words come easily. Keep purchases planned and conversations gentle.",
    "A 3rd-house Moon brings drive. Push through the task you’ve been avoiding; effort pays off today.",
    "With the Moon in your 4th, restlessness at home is possible. Keep the day simple and protect your quiet time.",
    "A 5th-house Moon can scatter attention. Good for creative play, poor for risky bets — avoid speculation.",
    "The Moon in your 6th helps you beat obstacles. Strong day for training, clearing backlogs and solving problems.",
    "A 7th-house Moon favours people. Meetings, collaboration and time with your partner go smoothly.",
    "Chandrashtama — the Moon is in your 8th. Avoid big decisions, new commitments and risky travel; go slow and double-check.",
    "With the Moon in your 9th, things may run late. Be patient with plans and lean on a mentor’s advice.",
    "The Moon lights up your 10th. Work gets noticed — take the lead on something visible.",
    "An 11th-house Moon brings gains and support. Ask for what you need; friends and networks help.",
    "The Moon in your 12th drains energy and invites expenses. Rest early, journal, and keep the wallet closed.",
  ],
  hinglish: [
    "Chandrama aapki apni rashi mein hai — aaj aap khud ko zyada balanced feel karoge. Achha khana, aaram aur chhoti khushiyan achhi lagengi.",
    "Chandrama 2nd bhav mein hai: kharcha aur kadwe shabd jaldi nikal sakte hain. Shopping plan karke karo aur baat pyaar se karo.",
    "3rd bhav ka Chandrama josh deta hai. Jo kaam taal rahe the, aaj kar daalo — mehnat ka phal milega.",
    "Chandrama 4th bhav mein hai, ghar par thodi bechaini ho sakti hai. Din simple rakho aur apna shaant time bachao.",
    "5th bhav ka Chandrama dhyaan bhatka sakta hai. Creative kaam ke liye achha, par risk aur satta-type faislon se bacho.",
    "6th bhav ka Chandrama rukawaton ko harane mein madad karta hai. Workout, pending kaam aur problems solve karne ke liye badhiya din.",
    "7th bhav ka Chandrama logon ke saath achha hai. Meetings, teamwork aur partner ke saath time achha jayega.",
    "Chandrashtama — Chandrama 8th bhav mein hai. Bade faisle, naye commitments aur risky travel se bacho; dheere chalo aur double-check karo.",
    "9th bhav ka Chandrama kaam mein deri la sakta hai. Plans ko lekar dhairya rakho aur kisi mentor ki salah lo.",
    "Chandrama 10th bhav ko roshan kar raha hai. Kaam par log notice karenge — kisi visible kaam ki lead lo.",
    "11th bhav ka Chandrama laabh aur support laata hai. Jo chahiye, maang lo; dost aur network madad karenge.",
    "12th bhav ka Chandrama energy kam karta hai aur kharche badhata hai. Jaldi so jao, journal likho aur wallet band rakho.",
  ],
  hi: [
    "चंद्रमा आपकी अपनी राशि में है — आज आप ख़ुद को ज़्यादा संतुलित महसूस करेंगे। अच्छा भोजन, आराम और छोटी ख़ुशियाँ अच्छी लगेंगी।",
    "चंद्रमा दूसरे भाव में है: ख़र्च और कड़वे शब्द आसानी से निकल सकते हैं। ख़रीदारी योजना से करें और बातचीत में नरमी रखें।",
    "तीसरे भाव का चंद्रमा उत्साह देता है। जो काम टाल रहे थे, आज पूरा करें — मेहनत का फल मिलेगा।",
    "चंद्रमा चौथे भाव में है, घर में बेचैनी हो सकती है। दिन सरल रखें और अपना शांत समय बचाएँ।",
    "पाँचवें भाव का चंद्रमा ध्यान भटका सकता है। रचनात्मक काम के लिए अच्छा, पर जोखिम और सट्टे से बचें।",
    "छठे भाव का चंद्रमा बाधाओं पर जीत दिलाता है। व्यायाम, अधूरे काम और समस्याएँ सुलझाने के लिए बढ़िया दिन।",
    "सातवें भाव का चंद्रमा लोगों से जुड़ने के लिए शुभ है। बैठकें, सहयोग और जीवनसाथी के साथ समय अच्छा रहेगा।",
    "चंद्राष्टम — चंद्रमा आठवें भाव में है। बड़े निर्णय, नई प्रतिबद्धताएँ और जोखिम भरी यात्रा टालें; धीरे चलें और दोबारा जाँचें।",
    "नौवें भाव का चंद्रमा कामों में देरी ला सकता है। योजनाओं में धैर्य रखें और किसी मार्गदर्शक की सलाह लें।",
    "चंद्रमा दसवें भाव को प्रकाशित कर रहा है। काम पर ध्यान जाएगा — किसी महत्वपूर्ण काम की अगुवाई करें।",
    "ग्यारहवें भाव का चंद्रमा लाभ और सहयोग लाता है। जो चाहिए, माँगें; मित्र और संपर्क मदद करेंगे।",
    "बारहवें भाव का चंद्रमा ऊर्जा घटाता है और ख़र्च बढ़ाता है। जल्दी सोएँ, डायरी लिखें और बटुआ बंद रखें।",
  ],
};

const TARA_TEXT: TriList = {
  en: [
    "Janma Tara — a sensitive day for you. Take care of your health and keep things steady.",
    "Sampat Tara favours wealth and good news.",
    "Vipat Tara warns of setbacks; keep a plan B.",
    "Kshema Tara supports wellbeing and safe progress.",
    "Pratyak Tara brings friction; avoid confrontations.",
    "Sadhana Tara rewards focused effort — good for practice and study.",
    "Naidhana Tara is the weakest; postpone what you can.",
    "Mitra Tara brings friendly support.",
    "Parama Mitra Tara is very supportive — a good day to begin things.",
  ],
  hinglish: [
    "Janma Tara — aaj aapke liye sensitive din hai. Sehat ka dhyaan rakho aur cheezein stable rakho.",
    "Sampat Tara dhan aur achhi khabar ke liye shubh hai.",
    "Vipat Tara rukawat ka ishara deta hai; plan B taiyaar rakho.",
    "Kshema Tara sehat aur surakshit tarakki mein saath deta hai.",
    "Pratyak Tara takraav la sakta hai; behes se bacho.",
    "Sadhana Tara focused mehnat ka inaam deta hai — practice aur padhai ke liye achha.",
    "Naidhana Tara sabse kamzor hai; jo taal sakte ho, taal do.",
    "Mitra Tara dosti bhara support laata hai.",
    "Param Mitra Tara bahut shubh hai — naya kaam shuru karne ke liye achha din.",
  ],
  hi: [
    "जन्म तारा — आज आपके लिए संवेदनशील दिन है। स्वास्थ्य का ध्यान रखें और चीज़ें स्थिर रखें।",
    "संपत तारा धन और शुभ समाचार के लिए अनुकूल है।",
    "विपत तारा रुकावट का संकेत देता है; दूसरी योजना तैयार रखें।",
    "क्षेम तारा स्वास्थ्य और सुरक्षित प्रगति में सहायक है।",
    "प्रत्यक तारा टकराव ला सकता है; बहस से बचें।",
    "साधना तारा एकाग्र प्रयास का फल देता है — अभ्यास और पढ़ाई के लिए अच्छा।",
    "नैधन तारा सबसे कमज़ोर है; जो टाल सकें, टाल दें।",
    "मित्र तारा मैत्रीपूर्ण सहयोग लाता है।",
    "परम मित्र तारा अत्यंत शुभ है — नया काम शुरू करने के लिए अच्छा दिन।",
  ],
};

const RIKTA: Record<HoroscopeLang, (tithi: string) => string> = {
  en: (t) => `It’s ${t} (a Rikta tithi), traditionally not ideal for beginnings.`,
  hinglish: (t) => `Aaj ${t} hai (Rikta tithi) — paramparik roop se naye kaam ki shuruaat ke liye achhi nahi maani jaati.`,
  hi: (t) => `आज ${t} है (रिक्ता तिथि) — परंपरा के अनुसार नए कार्य आरंभ करने के लिए उपयुक्त नहीं।`,
};

const AREA_TEXT: { [K in keyof AreaCodes]: Record<AreaCodes[K], Tri> } = {
  work: {
    good: {
      en: "Productive window for work: tackle the hard task first and make yourself visible.",
      hinglish: "Kaam ke liye productive time: mushkil kaam pehle karo aur khud ko visible rakho.",
      hi: "काम के लिए उत्पादक समय: कठिन काम पहले करें और अपनी उपस्थिति दिखाएँ।",
    },
    careful: {
      en: "Keep work low-risk: finish, review and tidy rather than launch.",
      hinglish: "Kaam mein risk kam rakho: naya launch karne ki jagah pura karo, review karo, settle karo.",
      hi: "काम में जोखिम कम रखें: नया शुरू करने के बजाय पूरा करें, समीक्षा करें और व्यवस्थित करें।",
    },
    neutral: {
      en: "Routine work flows; avoid overcommitting to new projects.",
      hinglish: "Routine kaam aaram se chalega; naye projects mein zyada commit mat karo.",
      hi: "रोज़मर्रा का काम ठीक चलेगा; नए प्रोजेक्ट में ज़रूरत से ज़्यादा वादा न करें।",
    },
  },
  money: {
    careful: {
      en: "Watch spending — impulse buys are likely. Log every expense today.",
      hinglish: "Kharche par nazar rakho — bina soche kharidari ho sakti hai. Aaj har kharcha log karo.",
      hi: "ख़र्च पर नज़र रखें — बिना सोचे ख़रीदारी हो सकती है। आज हर ख़र्च दर्ज करें।",
    },
    good: {
      en: "Supportive for finances: review your budget, pay dues, plan savings.",
      hinglish: "Paison ke liye achha din: budget dekho, bills bharo, savings plan karo.",
      hi: "आर्थिक मामलों के लिए अनुकूल: बजट देखें, बकाया चुकाएँ, बचत की योजना बनाएँ।",
    },
    neutral: {
      en: "Neutral for money — stick to your plan.",
      hinglish: "Paison ke maamle mein normal din — apne plan par tike raho.",
      hi: "धन के मामले में सामान्य दिन — अपनी योजना पर टिके रहें।",
    },
  },
  health: {
    high: {
      en: "Energy is good: a solid day to train hard.",
      hinglish: "Energy achhi hai: aaj jamkar workout karne ka din.",
      hi: "ऊर्जा अच्छी है: आज जमकर व्यायाम करने का दिन।",
    },
    low: {
      en: "Energy runs lower: light movement, early sleep, plenty of water.",
      hinglish: "Energy thodi kam rahegi: halki exercise, jaldi neend aur khoob paani.",
      hi: "ऊर्जा कुछ कम रहेगी: हल्का व्यायाम, जल्दी नींद और भरपूर पानी।",
    },
    moderate: {
      en: "Moderate energy — a normal session is fine; listen to your body.",
      hinglish: "Energy theek-thaak hai — normal session chalega; apne body ki suno.",
      hi: "ऊर्जा सामान्य है — सामान्य व्यायाम ठीक है; अपने शरीर की सुनें।",
    },
  },
  people: {
    good: {
      en: "Good for relationships and teamwork; reach out to someone.",
      hinglish: "Rishton aur teamwork ke liye achha; kisi se baat karo.",
      hi: "रिश्तों और टीमवर्क के लिए अच्छा; किसी से संपर्क करें।",
    },
    careful: {
      en: "Words can land harder than you mean — pause before replying.",
      hinglish: "Shabd aapki soch se zyada chubh sakte hain — jawab dene se pehle ruko.",
      hi: "शब्द आपकी सोच से ज़्यादा चुभ सकते हैं — जवाब देने से पहले रुकें।",
    },
    venusRetro: {
      en: "Venus is retrograde: revisit old connections rather than rush new ones.",
      hinglish: "Shukra vakri hai: naye rishte mein jaldi mat karo, purane connections phir se jodo.",
      hi: "शुक्र वक्री है: नए संबंधों में जल्दबाज़ी न करें, पुराने संबंधों को फिर से जोड़ें।",
    },
    steady: {
      en: "Relationships are steady; small kindnesses go far.",
      hinglish: "Rishte stable hain; chhoti si kindness bhi bahut kaam karti hai.",
      hi: "रिश्ते स्थिर हैं; छोटी-छोटी दयालुता बहुत असर करती है।",
    },
  },
  mind: {
    mercuryRetro: {
      en: "Mercury is retrograde — double-check messages, dates and anything you sign.",
      hinglish: "Budh vakri hai — messages, dates aur jo bhi sign karo, sab double-check karo.",
      hi: "बुध वक्री है — संदेश, तारीख़ें और जिस पर भी हस्ताक्षर करें, सब दोबारा जाँचें।",
    },
    space: {
      en: "Your mind needs space: journal, meditate, or walk without your phone.",
      hinglish: "Mann ko space chahiye: journal likho, meditate karo ya phone ke bina walk karo.",
      hi: "मन को स्थान चाहिए: डायरी लिखें, ध्यान करें या फ़ोन के बिना टहलें।",
    },
    clear: {
      en: "Clear thinking today; good for planning and learning.",
      hinglish: "Aaj soch saaf hai; planning aur seekhne ke liye achha.",
      hi: "आज विचार स्पष्ट हैं; योजना बनाने और सीखने के लिए अच्छा।",
    },
  },
};

const MODULE_LABEL: Record<ModuleKey, Tri> = {
  gym: { en: "Training", hinglish: "Workout", hi: "व्यायाम" },
  learning: { en: "Deep study", hinglish: "Padhai", hi: "गहन अध्ययन" },
  money: { en: "Budget review", hinglish: "Budget check", hi: "बजट समीक्षा" },
  journal: { en: "Reflection", hinglish: "Journal likhna", hi: "आत्मचिंतन" },
  habits: { en: "Keeping streaks", hinglish: "Streak banaye rakhna", hi: "आदतें निभाना" },
};

const AVOID_LABEL: Record<AvoidKey, Tri> = {
  decisions: { en: "big decisions", hinglish: "bade faisle", hi: "बड़े निर्णय" },
  beginnings: { en: "starting new ventures", hinglish: "naye kaam ki shuruaat", hi: "नए कार्य की शुरुआत" },
  spending: { en: "impulse spending", hinglish: "bina soche kharcha", hi: "बिना सोचे ख़र्च" },
  signing: { en: "signing without re-reading", hinglish: "bina padhe sign karna", hi: "बिना पढ़े हस्ताक्षर" },
  risky: { en: "risky plans", hinglish: "risky plans", hi: "जोखिम भरी योजनाएँ" },
};


// ---------- Transits, dignity, yogas, dasha ----------

const TRANSIT: Record<Graha, { good: Tri; bad: Tri }> = {
  Sun: {
    good: { en: "Recognition and confidence", hinglish: "Pehchaan aur confidence", hi: "मान-सम्मान और आत्मविश्वास" },
    bad: { en: "Ego clashes, low stamina", hinglish: "Ego ke jhagde, thakaan", hi: "अहं का टकराव, थकान" },
  },
  Moon: {
    good: { en: "Emotional ease, good mood", hinglish: "Mann khush, sukoon", hi: "मानसिक सुख, अच्छा मन" },
    bad: { en: "Moodiness, restlessness", hinglish: "Mood swings, bechaini", hi: "मन में उतार-चढ़ाव, बेचैनी" },
  },
  Mars: {
    good: { en: "Energy, courage, wins", hinglish: "Energy, himmat, jeet", hi: "ऊर्जा, साहस, विजय" },
    bad: { en: "Anger, haste — be careful", hinglish: "Gussa, jaldbaazi — savdhaan", hi: "क्रोध, जल्दबाज़ी — सावधान" },
  },
  Mercury: {
    good: { en: "Clear communication, good deals", hinglish: "Saaf baatcheet, achhe deals", hi: "स्पष्ट संवाद, अच्छे सौदे" },
    bad: { en: "Confusion, miscommunication", hinglish: "Confusion, galatfehmi", hi: "भ्रम, ग़लतफ़हमी" },
  },
  Jupiter: {
    good: { en: "Growth, blessings, wisdom", hinglish: "Tarakki, ashirwad, samajh", hi: "उन्नति, आशीर्वाद, ज्ञान" },
    bad: { en: "Slow progress, overspending", hinglish: "Dheemi tarakki, zyada kharcha", hi: "धीमी प्रगति, अधिक ख़र्च" },
  },
  Venus: {
    good: { en: "Comfort, love, pleasures", hinglish: "Sukh, pyaar, aanand", hi: "सुख, प्रेम, आनंद" },
    bad: { en: "Indulgence, relationship friction", hinglish: "Shauk mein kharcha, rishton mein khatpat", hi: "विलासिता, रिश्तों में खटपट" },
  },
  Saturn: {
    good: { en: "Discipline pays, steady gains", hinglish: "Discipline ka phal, stable laabh", hi: "अनुशासन का फल, स्थिर लाभ" },
    bad: { en: "Delays and pressure — be patient", hinglish: "Deri aur pressure — dhairya rakho", hi: "देरी और दबाव — धैर्य रखें" },
  },
  Rahu: {
    good: { en: "Ambition, unexpected gains", hinglish: "Ambition, achaanak laabh", hi: "महत्वाकांक्षा, अचानक लाभ" },
    bad: { en: "Confusion, restless desires", hinglish: "Uljhan, bechain ichhaayein", hi: "भ्रम, बेचैन इच्छाएँ" },
  },
  Ketu: {
    good: { en: "Insight, healthy detachment", hinglish: "Gehri samajh, vairagya", hi: "अंतर्दृष्टि, स्वस्थ वैराग्य" },
    bad: { en: "Isolation, sudden setbacks", hinglish: "Akelapan, achaanak rukawat", hi: "अकेलापन, अचानक बाधा" },
  },
};
export const transitText = (g: Graha, good: boolean, lang: HoroscopeLang) => TRANSIT[g][good ? "good" : "bad"][lang];

const DIGNITY: Record<"exalted" | "debilitated" | "own", Tri> = {
  exalted: { en: "Exalted", hinglish: "Uchch", hi: "उच्च" },
  debilitated: { en: "Debilitated", hinglish: "Neech", hi: "नीच" },
  own: { en: "Own sign", hinglish: "Swagrahi", hi: "स्वगृही" },
};
export const dignityText = (d: "exalted" | "debilitated" | "own", lang: HoroscopeLang) => DIGNITY[d][lang];

const YOGA_TEXT: Record<YogaKey, { name: Tri; text: Tri }> = {
  gajaKesari: {
    name: { en: "Gaja Kesari Yoga", hinglish: "Gaja Kesari Yog", hi: "गजकेसरी योग" },
    text: { en: "Jupiter in a kendra from the Moon: wisdom, reputation and the ability to overcome difficulties.", hinglish: "Guru Chandra se kendra mein: samajhdaari, naam aur mushkilon se nikalne ki taakat.", hi: "गुरु चंद्र से केंद्र में: बुद्धि, यश और कठिनाइयों पर विजय की क्षमता।" },
  },
  budhaditya: {
    name: { en: "Budhaditya Yoga", hinglish: "Budhaditya Yog", hi: "बुधादित्य योग" },
    text: { en: "Sun with Mercury: sharp intellect, good communication and skill in learning.", hinglish: "Surya aur Budh saath: tez dimaag, achhi baatcheet aur seekhne ka hunar.", hi: "सूर्य-बुध साथ: तीक्ष्ण बुद्धि, अच्छा संवाद और सीखने की कला।" },
  },
  chandraMangala: {
    name: { en: "Chandra-Mangala Yoga", hinglish: "Chandra-Mangal Yog", hi: "चंद्र-मंगल योग" },
    text: { en: "Moon with Mars: drive and earning power, with emotions that run hot.", hinglish: "Chandra aur Mangal saath: kamaane ka josh, par emotions jaldi garam.", hi: "चंद्र-मंगल साथ: कमाने की ऊर्जा, पर भावनाएँ जल्दी उग्र।" },
  },
  ruchaka: {
    name: { en: "Ruchaka Yoga", hinglish: "Ruchak Yog", hi: "रुचक योग" },
    text: { en: "A strong Mars in a kendra: courage, leadership and physical vitality.", hinglish: "Kendra mein balwaan Mangal: himmat, leadership aur shaareerik taakat.", hi: "केंद्र में बलवान मंगल: साहस, नेतृत्व और शारीरिक बल।" },
  },
  bhadra: {
    name: { en: "Bhadra Yoga", hinglish: "Bhadra Yog", hi: "भद्र योग" },
    text: { en: "A strong Mercury in a kendra: intelligence, eloquence and business sense.", hinglish: "Kendra mein balwaan Budh: buddhi, vaakpatuta aur business ki samajh.", hi: "केंद्र में बलवान बुध: बुद्धि, वाक्पटुता और व्यापार-कौशल।" },
  },
  hamsa: {
    name: { en: "Hamsa Yoga", hinglish: "Hans Yog", hi: "हंस योग" },
    text: { en: "A strong Jupiter in a kendra: wisdom, ethics and respect from others.", hinglish: "Kendra mein balwaan Guru: gyaan, achhe sanskaar aur samman.", hi: "केंद्र में बलवान गुरु: ज्ञान, सदाचार और सम्मान।" },
  },
  malavya: {
    name: { en: "Malavya Yoga", hinglish: "Malavya Yog", hi: "मालव्य योग" },
    text: { en: "A strong Venus in a kendra: charm, artistic taste and comforts.", hinglish: "Kendra mein balwaan Shukra: aakarshan, kalaatmak ruchi aur sukh-suvidha.", hi: "केंद्र में बलवान शुक्र: आकर्षण, कलात्मक रुचि और सुख-सुविधा।" },
  },
  sasa: {
    name: { en: "Sasa Yoga", hinglish: "Shash Yog", hi: "शश योग" },
    text: { en: "A strong Saturn in a kendra: discipline, endurance and authority over time.", hinglish: "Kendra mein balwaan Shani: anushasan, sahansheelta aur samay ke saath adhikaar.", hi: "केंद्र में बलवान शनि: अनुशासन, धैर्य और समय के साथ अधिकार।" },
  },
  mangalDosha: {
    name: { en: "Mangal Dosha", hinglish: "Mangal Dosh", hi: "मंगल दोष" },
    text: { en: "Mars in a sensitive house: temper and impatience in close relationships. Traditionally checked for marriage matching.", hinglish: "Mangal sensitive bhav mein: kareebi rishton mein gussa aur jaldbaazi. Shaadi milaan mein dekha jaata hai.", hi: "मंगल संवेदनशील भाव में: निकट संबंधों में क्रोध और अधीरता। विवाह मिलान में देखा जाता है।" },
  },
  kemadruma: {
    name: { en: "Kemadruma Dosha", hinglish: "Kemadrum Dosh", hi: "केमद्रुम दोष" },
    text: { en: "The Moon stands alone: phases of loneliness or uncertainty; steady routines help.", hinglish: "Chandra akela hai: kabhi-kabhi akelapan ya anishchitata; routine madad karta hai.", hi: "चंद्र अकेला है: कभी-कभी अकेलापन या अनिश्चितता; नियमित दिनचर्या सहायक।" },
  },
  kaalSarp: {
    name: { en: "Kaal Sarp Dosha", hinglish: "Kaal Sarp Dosh", hi: "कालसर्प दोष" },
    text: { en: "All planets between Rahu and Ketu: life moves in sudden surges and stalls; persistence pays.", hinglish: "Saare grah Rahu-Ketu ke beech: zindagi mein achaanak tezi aur rukawat; lagan se kaam banta hai.", hi: "सभी ग्रह राहु-केतु के बीच: जीवन में अचानक तेज़ी और ठहराव; लगन से सफलता।" },
  },
};
export const yogaText = (k: YogaKey, lang: HoroscopeLang) => ({ name: YOGA_TEXT[k].name[lang], text: YOGA_TEXT[k].text[lang] });

// ---------- UI labels ----------

const UI = {
  title: { en: "Horoscope", hinglish: "Rashifal", hi: "राशिफल" },
  vedic: { en: "Vedic, Lahiri", hinglish: "Vedic, Lahiri", hi: "वैदिक, लाहिड़ी" },
  birthDetails: { en: "Birth details", hinglish: "Janm vivaran", hi: "जन्म विवरण" },
  today: { en: "Today", hinglish: "Aaj", hi: "आज" },
  yourChart: { en: "Your chart", hinglish: "Aapki kundli", hi: "आपकी कुंडली" },
  rashi: { en: "Rashi (Moon sign)", hinglish: "Rashi (Chandra rashi)", hi: "राशि (चंद्र राशि)" },
  nakshatra: { en: "Nakshatra", hinglish: "Nakshatra", hi: "नक्षत्र" },
  lagna: { en: "Lagna", hinglish: "Lagna", hi: "लग्न" },
  addTime: { en: "Add birth time", hinglish: "Janm samay jodo", hi: "जन्म समय जोड़ें" },
  surya: { en: "Surya Rashi", hinglish: "Surya Rashi", hi: "सूर्य राशि" },
  saturn: { en: "Saturn", hinglish: "Shani", hi: "शनि" },
  pada: { en: "pada", hinglish: "pada", hi: "चरण" },
  work: { en: "Work", hinglish: "Kaam", hi: "कार्य" },
  money: { en: "Money", hinglish: "Paisa", hi: "धन" },
  health: { en: "Health", hinglish: "Sehat", hi: "स्वास्थ्य" },
  people: { en: "Relationships", hinglish: "Rishte", hi: "संबंध" },
  mind: { en: "Mind", hinglish: "Mann", hi: "मन" },
  goodFor: { en: "Good for today", hinglish: "Aaj ke liye achha", hi: "आज के लिए शुभ" },
  avoid: { en: "Better to avoid", hinglish: "Inse bachein", hi: "इनसे बचें" },
  chandrabala: { en: "Chandrabala", hinglish: "Chandrabal", hi: "चंद्रबल" },
  tarabala: { en: "Tarabala", hinglish: "Tarabal", hi: "ताराबल" },
  jupiter: { en: "Jupiter", hinglish: "Guru", hi: "गुरु" },
  tithi: { en: "Tithi", hinglish: "Tithi", hi: "तिथि" },
  favourable: { en: "favourable", hinglish: "shubh", hi: "शुभ" },
  unfavourable: { en: "unfavourable", hinglish: "ashubh", hi: "अशुभ" },
  supportive: { en: "supportive", hinglish: "sahayak", hi: "सहायक" },
  riktaShort: { en: "Rikta (avoid beginnings)", hinglish: "Rikta (shuruaat na karein)", hi: "रिक्ता (आरंभ न करें)" },
  goodStart: { en: "fine for beginnings", hinglish: "shuruaat ke liye theek", hi: "आरंभ के लिए ठीक" },
  panchang: { en: "Panchang", hinglish: "Panchang", hi: "पंचांग" },
  vara: { en: "Vara", hinglish: "Vaar", hi: "वार" },
  yoga: { en: "Yoga", hinglish: "Yog", hi: "योग" },
  moon: { en: "Moon", hinglish: "Chandrama", hi: "चंद्रमा" },
  waxing: { en: "waxing", hinglish: "badhta", hi: "बढ़ता" },
  waning: { en: "waning", hinglish: "ghatta", hi: "घटता" },
  sunriseSunset: { en: "Sunrise / sunset", hinglish: "Suryoday / suryast", hi: "सूर्योदय / सूर्यास्त" },
  rahuKaal: { en: "Rahu Kaal", hinglish: "Rahu Kaal", hi: "राहु काल" },
  rahuNow: { en: "Rahu Kaal now", hinglish: "Abhi Rahu Kaal", hi: "अभी राहु काल" },
  weekAhead: { en: "Week ahead", hinglish: "Aane wala hafta", hi: "आने वाला सप्ताह" },
  grahas: { en: "Grahas today", hinglish: "Aaj ke grah", hi: "आज के ग्रह" },
  graha: { en: "Graha", hinglish: "Grah", hi: "ग्रह" },
  degree: { en: "Degree", hinglish: "Ansh", hi: "अंश" },
  houseFromMoon: { en: "House from Moon", hinglish: "Chandra se bhav", hi: "चंद्र से भाव" },
  chandrashtama: { en: "Chandrashtama", hinglish: "Chandrashtam", hi: "चंद्राष्टम" },
  where: { en: "Where are you today?", hinglish: "Aaj aap kahan ho?", hi: "आज आप कहाँ हैं?" },
  disclaimer: {
    en: "Positions from the Swiss Ephemeris (sidereal, Lahiri ayanamsa, true node; whole-sign houses). Readings follow classical Vedic rules — Chandrabala, Tarabala, Gochara, Vimshottari — and are for reflection and planning, not a guarantee of events.",
    hinglish: "Grahon ki sthiti Swiss Ephemeris se (sidereal, Lahiri ayanamsa, true node; whole-sign bhav). Rashifal paramparik Vedic niyamon — Chandrabal, Tarabal, Gochar, Vimshottari — par aadharit hai; ye soch-vichar aur planning ke liye hai, ghatnaon ki guarantee nahi.",
    hi: "ग्रह स्थिति स्विस एफ़ेमेरिस से (निरयण, लाहिड़ी अयनांश, सत्य राहु; संपूर्ण राशि भाव)। राशिफल पारंपरिक वैदिक नियमों — चंद्रबल, ताराबल, गोचर, विंशोत्तरी — पर आधारित है; यह चिंतन और योजना के लिए है, घटनाओं की गारंटी नहीं।",
  },
  sadeSati: { en: "Sade Sati", hinglish: "Sade Sati", hi: "साढ़े साती" },
  phase: {
    en: { rising: "rising phase", peak: "peak phase", setting: "setting phase" },
    hinglish: { rising: "pehla charan", peak: "beech ka charan", setting: "aakhri charan" },
    hi: { rising: "पहला चरण", peak: "मध्य चरण", setting: "अंतिम चरण" },
  },
  fromMoon: { en: "from Moon", hinglish: "Chandra se", hi: "चंद्र से" },
  house: { en: "house", hinglish: "bhav", hi: "भाव" },
  todaySky: { en: "Today’s sky", hinglish: "Aaj ka rashifal", hi: "आज का राशिफल" },
  karana: { en: "Karana", hinglish: "Karan", hi: "करण" },
  until: { en: "until", hinglish: "tak", hi: "तक" },
  moonriseMoonset: { en: "Moonrise / moonset", hinglish: "Chandroday / chandrast", hi: "चंद्रोदय / चंद्रास्त" },
  yamaganda: { en: "Yamaganda", hinglish: "Yamagand", hi: "यमगंड" },
  gulika: { en: "Gulika Kaal", hinglish: "Gulik Kaal", hi: "गुलिक काल" },
  abhijit: { en: "Abhijit Muhurat", hinglish: "Abhijit Muhurat", hi: "अभिजित मुहूर्त" },
  brahma: { en: "Brahma Muhurta", hinglish: "Brahma Muhurat", hi: "ब्रह्म मुहूर्त" },
  avoidTimes: { en: "Times to avoid", hinglish: "Inn samay se bachein", hi: "वर्जित समय" },
  goodTimes: { en: "Auspicious times", hinglish: "Shubh samay", hi: "शुभ समय" },
  birthChart: { en: "Birth chart", hinglish: "Janm kundli", hi: "जन्म कुंडली" },
  d1: { en: "Rashi · D1", hinglish: "Rashi · D1", hi: "राशि · D1" },
  d9: { en: "Navamsa · D9", hinglish: "Navansh · D9", hi: "नवांश · D9" },
  planets: { en: "Planets at birth", hinglish: "Janm ke samay grah", hi: "जन्म के समय ग्रह" },
  status: { en: "Status", hinglish: "Sthiti", hi: "स्थिति" },
  retro: { en: "Retrograde", hinglish: "Vakri", hi: "वक्री" },
  combust: { en: "Combust", hinglish: "Ast", hi: "अस्त" },
  dasha: { en: "Vimshottari Dasha", hinglish: "Vimshottari Dasha", hi: "विंशोत्तरी दशा" },
  maha: { en: "Mahadasha", hinglish: "Mahadasha", hi: "महादशा" },
  antar: { en: "Antardasha", hinglish: "Antardasha", hi: "अंतर्दशा" },
  pratyantar: { en: "Pratyantar", hinglish: "Pratyantar", hi: "प्रत्यंतर" },
  timeline: { en: "Mahadasha timeline", hinglish: "Mahadasha timeline", hi: "महादशा क्रम" },
  yogas: { en: "Yogas & doshas", hinglish: "Yog aur dosh", hi: "योग और दोष" },
  noYogas: { en: "None of the tracked combinations are present.", hinglish: "In mein se koi yog nahi bana.", hi: "इनमें से कोई योग नहीं बना।" },
  transits: { en: "Transits today (Gochara)", hinglish: "Aaj ka gochar", hi: "आज का गोचर" },
  dashaNow: { en: "Running dasha", hinglish: "Chal rahi dasha", hi: "चल रही दशा" },
  timeNeeded: { en: "Add your birth time to see Lagna, houses and the Navamsa chart.", hinglish: "Lagna, bhav aur Navansh dekhne ke liye janm samay jodo.", hi: "लग्न, भाव और नवांश देखने के लिए जन्म समय जोड़ें।" },
  chandraLagna: { en: "Houses counted from the Moon (birth time unknown).", hinglish: "Bhav Chandra se gine gaye (janm samay nahi pata).", hi: "भाव चंद्र से गिने गए (जन्म समय अज्ञात)।" },
  source: { en: "Ephemeris", hinglish: "Ephemeris", hi: "पंचांग गणना" },
} as const;

export function ui(lang: HoroscopeLang) {
  return Object.fromEntries(Object.entries(UI).map(([k, v]) => [k, (v as Record<HoroscopeLang, unknown>)[lang]])) as {
    [K in keyof typeof UI]: (typeof UI)[K][HoroscopeLang];
  };
}

/** Everything a reading needs to say, in one language. */
export function readingText(r: Reading, lang: HoroscopeLang, tithi: { paksha: "Shukla" | "Krishna"; day: number; number: number }) {
  const n = names(lang);
  const headlines = HEADLINES[r.headline.key][lang];
  return {
    headline: headlines[r.headline.variant % headlines.length],
    summary: [MOON_TEXT[lang][r.moon.house - 1], TARA_TEXT[lang][r.tara.index], r.rikta ? RIKTA[lang](n.tithi(tithi)) : null].filter(Boolean).join(" "),
    areas: (Object.keys(AREA_TEXT) as (keyof AreaCodes)[]).map((k) => ({
      key: k,
      text: (AREA_TEXT[k] as Record<string, Tri>)[r.areas[k]][lang],
    })),
    goodFor: r.goodFor.map((g) => ({ ...g, label: MODULE_LABEL[g.module][lang] })),
    avoid: r.avoid.map((a) => AVOID_LABEL[a][lang]),
  };
}
