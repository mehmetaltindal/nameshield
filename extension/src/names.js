// NameShield — isim sözlükleri, takma ad üretici ve eşleştirme yardımcıları.
// Hem content script hem de popup/options sayfaları tarafından kullanılır.
(function (root) {
  "use strict";

  // Yaygın Türkçe ilk isimler → ses/anlam olarak yakın İngilizce karşılıklar.
  const FIRST_NAME_MAP = {
    mehmet: "Matthew", ahmet: "Adam", mustafa: "Max", ali: "Alex", hasan: "Harrison",
    huseyin: "Hudson", ibrahim: "Abraham", ismail: "Ishmael", yusuf: "Joseph", murat: "Murray",
    omer: "Homer", osman: "Oscar", kemal: "Kevin", emre: "Emery", burak: "Brook",
    can: "John", cem: "James", deniz: "Dennis", efe: "Ethan", eren: "Aaron",
    erkan: "Eric", fatih: "Frank", gokhan: "Gordon", hakan: "Hank", halil: "Hal",
    ilker: "Elliot", kaan: "Kane", kerem: "Cameron", mert: "Mark", onur: "Owen",
    ozan: "Oscar", selim: "Sam", serkan: "Sean", sinan: "Simon", tolga: "Tom",
    tuncay: "Tony", ugur: "Hugo", umut: "Hugh", volkan: "Vincent", yasin: "Jason",
    yunus: "Jonah", baris: "Barry", berk: "Burke", cagri: "Charlie", dogan: "Douglas",
    emir: "Emmett", enes: "Ennis", furkan: "Franklin", gurkan: "Gary", kadir: "Carter",
    levent: "Leonard", metin: "Martin", oguz: "Oliver", ramazan: "Ramsey", recep: "Reggie",
    salih: "Sully", tarik: "Tyler", tayfun: "Travis", yigit: "Eugene", zafer: "Zachary",
    ayse: "Ashley", fatma: "Faith", emine: "Emily", hatice: "Hattie", zeynep: "Zoe",
    elif: "Ellie", meryem: "Mary", merve: "Marvel", busra: "Bonnie", esra: "Ezra",
    ozlem: "Olivia", selin: "Selena", ece: "Eve", dilek: "Delilah", derya: "Daria",
    sevgi: "Sophie", gul: "Grace", gulsen: "Gwen", hande: "Hannah", irem: "Irene",
    kubra: "Kara", leyla: "Layla", melek: "Melanie", melis: "Melissa", nur: "Nora",
    pinar: "Penny", seda: "Sadie", sibel: "Sybil", tugba: "Tabitha", yasemin: "Jasmine",
    asli: "Alice", aylin: "Eileen", buse: "Bess", ceren: "Karen", damla: "Dana",
    ebru: "Abby", gamze: "Gemma", ipek: "Ivy", nazli: "Natalie", sena: "Sienna",

    // Erkek isimleri
    tayyip: "Tyler", suleyman: "Solomon", abdullah: "Abbott", abdulkadir: "Abe", abdurrahman: "Abraham",
    adem: "Adam", adnan: "Adrian", akif: "Archie", alp: "Alan", alper: "Albert",
    anil: "Neil", arda: "Arthur", arif: "Arnold", atilla: "Atticus", aydin: "Aiden", bahadir: "Baxter",
    batuhan: "Bastian", bayram: "Byron", bekir: "Baker", bilal: "Bill", bulent: "Brent", bunyamin: "Benjamin",
    cahit: "Chad", celal: "Cecil", cengiz: "Chase", cetin: "Chester", cihan: "Ian", coskun: "Cosmo",
    davut: "David", dursun: "Dustin", ekrem: "Eric", emin: "Edwin", engin: "Ian", ercan: "Eric",
    erdal: "Ernie", erdem: "Edmund", erdogan: "Douglas", ersin: "Austin", ertugrul: "Ernest", eyup: "Job",
    faruk: "Frank", ferhat: "Fred", fikret: "Frederick", fuat: "Floyd", gokay: "Gary", guven: "Gavin",
    hamza: "Hamilton", harun: "Aaron", hayati: "Harvey", hikmet: "Hector", idris: "Enoch",
    ilhan: "Ilan", ilyas: "Elias", irfan: "Irving", ismet: "Isaac", kamil: "Camille", kenan: "Kenneth",
    koray: "Corey", korkmaz: "Conrad", kursat: "Curtis", lutfi: "Luther", mahmut: "Matt",
    melih: "Miles", mesut: "Mason", mevlut: "Melvin", mikail: "Michael", muhammed: "Mitchell", muhammet: "Mitchell",
    musa: "Moses", mutlu: "Murphy", nail: "Neil", necati: "Nathan", necmettin: "Nelson", nevzat: "Newton",
    nihat: "Nathaniel", nuri: "Noel", nurettin: "Norman", oktay: "Otto", orhan: "Orson", ozgur: "Oswald",
    ramiz: "Ramsey", rasim: "Russell", resat: "Rashad", riza: "Reese", ridvan: "Ryan", rustu: "Rusty",
    sabri: "Sebastian", sadik: "Sam", sahin: "Shane", samet: "Samuel", savas: "Sawyer", sedat: "Seth",
    selahattin: "Sullivan", selcuk: "Shelby", sefa: "Seth", semih: "Sam", sener: "Shane", sevket: "Scott",
    sezer: "Caesar", sukru: "Scott", taha: "Tate", tahir: "Taylor", taner: "Tanner", tekin: "Ted",
    timur: "Tim", turgut: "Trevor", tuncer: "Tucker", tugrul: "Trevor", umit: "Hugh", vahit: "Wade",
    vedat: "Wade", veli: "Wally", yakup: "Jacob", yalcin: "Jace", yavuz: "Yves", yildirim: "Wilder",
    yilmaz: "William", yuksel: "Joel", zeki: "Zeke", zekeriya: "Zachary", ziya: "Zane",
    alparslan: "Alistair", berkay: "Barclay", caner: "Connor", erhan: "Ethan", ilkay: "Elijah",
    kutay: "Curtis", ogulcan: "Oliver", sertac: "Sergio", tuna: "Toby", utku: "Hugo", yagiz: "Jake",
    cevdet: "Cedric", akin: "Archer", askin: "Asher", yasar: "Jasper", devlet: "Devin",
    musavat: "Maverick", numan: "Noah", mansur: "Manuel",

    // Kadın isimleri
    betul: "Bethany", aleyna: "Alana", arzu: "Aria", ayla: "Ayla", aysel: "Isabel", aysun: "Allison",
    azra: "Azure", bahar: "Belle", banu: "Bonnie", berna: "Bernadette", beyza: "Bella", burcu: "Brooke",
    canan: "Candice", cansu: "Cassie", cigdem: "Cindy", demet: "Demi", didem: "Diana", dilan: "Dylan",
    duygu: "Daisy", eda: "Edie", ela: "Ella", elcin: "Elsa", emel: "Emily", esma: "Esme",
    filiz: "Felicity", funda: "Fiona", gizem: "Gemma", gonul: "Glenda", gulay: "Gloria", gulsum: "Gwen",
    gulten: "Gwendolyn", hacer: "Hazel", hale: "Hailey", havva: "Eve", hilal: "Hillary", hulya: "Julia",
    ilknur: "Eleanor", kader: "Kathy", kevser: "Kelsey", lale: "Lily", latife: "Laticia", mine: "Mina",
    muge: "Megan", nalan: "Nadine", nermin: "Nora", nesrin: "Nancy", nihan: "Nina", nilufer: "Nellie",
    nurcan: "Nora", nursel: "Norma", oya: "Olivia", ozge: "Ozzie", perihan: "Paris", rabia: "Rebecca",
    reyhan: "Rhiannon", rukiye: "Ruby", sabriye: "Sabrina", saadet: "Sadie", safiye: "Sophia", saliha: "Sally",
    semra: "Sierra", serap: "Sarah", sevda: "Savannah", sevim: "Sophie", sevinc: "Sylvia", sinem: "Sienna",
    songul: "Sonia", sule: "Shelly", sukran: "Sharon", tuba: "Tabitha", tulay: "Tula", tulin: "Tilly",
    umran: "Uma", yeliz: "Elise", yesim: "Jessie", yildiz: "Stella", zehra: "Zara", zerrin: "Zelda",
    zuhal: "Zoe", zubeyde: "Zelda", zuleyha: "Julia", asiye: "Asia", cemile: "Camila", dilara: "Delilah",
    ecrin: "Erin", elvan: "Ellen", hatun: "Hattie", irmak: "Irma", kardelen: "Caroline", lara: "Lara",
    medine: "Madeline", mahinur: "Marina", nehir: "Nell", pelin: "Pauline", rumeysa: "Rosemary", tuana: "Tiana", zisan: "Jasmine"
  };

  // Harf bazlı İngilizce ilk isim havuzu (sözlükte olmayan isimler için).
  const FIRST_NAMES = {
    a: ["Adam", "Alex", "Andrew", "Aaron", "Allen", "Austin", "Abigail", "Amelia", "Alice"],
    b: ["Benjamin", "Blake", "Bradley", "Bryan", "Brooke", "Bella", "Bonnie"],
    c: ["Charles", "Christopher", "Connor", "Caleb", "Claire", "Chloe", "Caroline"],
    d: ["Daniel", "David", "Dylan", "Derek", "Dana", "Diana", "Daisy"],
    e: ["Edward", "Ethan", "Elliot", "Evan", "Emily", "Emma", "Eleanor"],
    f: ["Frank", "Felix", "Finn", "Frederick", "Faith", "Fiona", "Florence"],
    g: ["George", "Gavin", "Gordon", "Grant", "Grace", "Gemma", "Georgia"],
    h: ["Henry", "Harrison", "Hudson", "Harvey", "Hannah", "Hazel", "Holly"],
    i: ["Ian", "Isaac", "Irving", "Isabel", "Ivy", "Iris"],
    j: ["James", "Jack", "Jason", "Jonathan", "Jessica", "Julia", "Jasmine"],
    k: ["Kevin", "Kyle", "Keith", "Kenneth", "Kate", "Kimberly", "Kara"],
    l: ["Liam", "Logan", "Lucas", "Leonard", "Laura", "Lily", "Lauren"],
    m: ["Matthew", "Michael", "Martin", "Mark", "Megan", "Molly", "Madison"],
    n: ["Nathan", "Nicholas", "Noah", "Neil", "Natalie", "Nora", "Nicole"],
    o: ["Oliver", "Owen", "Oscar", "Otis", "Olivia", "Opal"],
    p: ["Patrick", "Peter", "Paul", "Philip", "Penny", "Paige", "Phoebe"],
    r: ["Ryan", "Robert", "Richard", "Russell", "Rachel", "Rose", "Ruby"],
    s: ["Samuel", "Simon", "Scott", "Sean", "Sarah", "Sophie", "Stella"],
    t: ["Thomas", "Tyler", "Timothy", "Travis", "Taylor", "Tessa", "Tabitha"],
    u: ["Ulysses", "Upton", "Una", "Ursula"],
    v: ["Victor", "Vincent", "Vaughn", "Victoria", "Violet", "Vivian"],
    w: ["William", "Walter", "Wesley", "Wyatt", "Wendy", "Willow"],
    y: ["Yale", "York", "Yvonne", "Yasmine"],
    z: ["Zachary", "Zane", "Zoe", "Zara"]
  };

  // Harf bazlı İngilizce soyadı havuzu.
  const SURNAMES = {
    a: ["Alleyson", "Allington", "Anderson", "Atkinson", "Ashton", "Aldridge", "Alden", "Ainsley", "Abbott", "Arlington"],
    b: ["Bradley", "Bennett", "Barlow", "Brooks", "Bristow", "Barton", "Blakely", "Burton", "Bayliss", "Buckley"],
    c: ["Carter", "Collins", "Cranston", "Chandler", "Cooper", "Caldwell", "Carlisle", "Chester", "Crawford", "Cole"],
    d: ["Dalton", "Davenport", "Dawson", "Denton", "Dixon", "Dorsey", "Dunbar", "Durham", "Darby", "Doyle"],
    e: ["Ellison", "Emerson", "Everett", "Easton", "Edwards", "Elliott", "Elmore", "Ennis", "Eldridge", "Ashby"],
    f: ["Fletcher", "Foster", "Fairfax", "Fenton", "Fielding", "Fowler", "Franklin", "Fulton", "Forbes", "Finch"],
    g: ["Garrison", "Gibson", "Graham", "Grayson", "Gilbert", "Goodwin", "Granger", "Griffin", "Gale", "Gardner"],
    h: ["Harrington", "Hamilton", "Hartley", "Hayes", "Holden", "Howell", "Huxley", "Hanley", "Harper", "Hudson"],
    i: ["Ingram", "Irving", "Iverson", "Isley", "Ives", "Inglewood"],
    j: ["Jameson", "Jennings", "Jarvis", "Jefferson", "Jordan", "Jacobs", "Judd"],
    k: ["Kendall", "Kingsley", "Kensington", "Kirby", "Knight", "Keaton", "Kimball", "Kerrigan", "Kidd"],
    l: ["Lawson", "Langley", "Lancaster", "Lockwood", "Lowell", "Lambert", "Lindsey", "Lyndon", "Lester"],
    m: ["Mitchell", "Morrison", "Mansfield", "Maxwell", "Marlow", "Mercer", "Milton", "Montgomery", "Murray"],
    n: ["Norton", "Newman", "Nash", "Nolan", "Norwood", "Nelson", "Newell", "Neville"],
    o: ["Oakley", "Oliver", "Osborne", "Owens", "Orwell", "Oldham", "Ogden", "Orton"],
    p: ["Parker", "Preston", "Pemberton", "Prescott", "Palmer", "Porter", "Pierce", "Pryor"],
    r: ["Riley", "Russell", "Rutherford", "Remington", "Radley", "Rowland", "Rhodes", "Ramsey"],
    s: ["Sullivan", "Sheridan", "Stanton", "Sinclair", "Sherwood", "Stratford", "Sawyer", "Sutton", "Shelby"],
    t: ["Thompson", "Tennyson", "Turner", "Thornton", "Tucker", "Talbot", "Tilden", "Thatcher", "Tyson"],
    u: ["Upton", "Underwood", "Usher", "Upshaw"],
    v: ["Vaughn", "Vance", "Vernon", "Valentine", "Vickers"],
    w: ["Walker", "Whitman", "Winslow", "Wellington", "Whitaker", "Warren", "Weston", "Wyatt"],
    y: ["Yates", "Yardley", "Young", "Yorke"],
    z: ["Zimmerman", "Zane", "Zeller"]
  };

  const FOLD = { "ç": "c", "ğ": "g", "ı": "i", "i̇": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };

  // Türkçe karakterleri ASCII'ye indirger ve küçük harfe çevirir.
  function fold(str) {
    return str
      .toLocaleLowerCase("tr")
      .replace(/i̇/g, "i")
      .replace(/[çğıöşüâîû]/g, (c) => FOLD[c] || c);
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function bigrams(s) {
    const out = new Set();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  }

  function similarity(a, b) {
    const A = bigrams(a), B = bigrams(fold(b));
    if (!A.size || !B.size) return 0;
    let common = 0;
    A.forEach((g) => { if (B.has(g)) common++; });
    return (2 * common) / (A.size + B.size);
  }

  // Aynı harfle başlayan, sese en yakın adayları seçer; `variant` ile alternatifler arasında döner.
  function pickFromPool(word, pool, variant) {
    const key = fold(word);
    const letter = key[0];
    const candidates = pool[letter] || pool[Object.keys(pool)[hash(key) % Object.keys(pool).length]];
    const ranked = candidates
      .map((c) => ({ c, score: similarity(key, c) + (hash(key + c) % 100) / 10000 }))
      .sort((x, y) => y.score - x.score)
      .map((x) => x.c);
    return ranked[variant % ranked.length];
  }

  function aliasForFirst(word, variant) {
    const mapped = FIRST_NAME_MAP[fold(word)];
    if (mapped && variant === 0) return mapped;
    return pickFromPool(word, FIRST_NAMES, mapped ? variant - 1 : variant);
  }

  function aliasForSurname(word, variant) {
    return pickFromPool(word, SURNAMES, variant);
  }

  // "Mehmet Altındal" → "Matthew Alleyson". Son kelime soyadı, diğerleri ilk isim kabul edilir.
  function generateAlias(fullName, variant = 0) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return aliasForFirst(parts[0], variant);
    // Alternatiflerde önce soyadı değişir; ilk isim (ve cinsiyeti) daha geç değişir.
    return parts
      .map((p, i) => (i === parts.length - 1 ? aliasForSurname(p, variant) : aliasForFirst(p, Math.floor(variant / 4))))
      .join(" ");
  }

  // Her harf için Türkçe/ASCII ve büyük/küçük varyantlarını kapsayan karakter sınıfı.
  const CHAR_CLASS = {
    c: "cCçÇ", g: "gGğĞ", i: "iIıİ", o: "oOöÖ", s: "sSşŞ", u: "uUüÜ", a: "aAâÂ"
  };

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function wordPattern(word) {
    return Array.from(fold(word))
      .map((ch) => {
        if (CHAR_CLASS[ch]) return "[" + CHAR_CLASS[ch] + "]";
        if (/\p{L}/u.test(ch)) return "[" + escapeRe(ch) + escapeRe(ch.toUpperCase()) + "]";
        return escapeRe(ch);
      })
      .join("");
  }

  // Kurallardan tek bir regex + eşleşme → takma ad tablosu üretir.
  // rules: [{ real: "Mehmet Altındal", alias: "Matthew Alleyson" }]
  // Hazır liste kuralları ayrıca `alone` taşır: tek başına (ya da kısaltılmış) değiştirilecek
  // kelime/öbekler. `alone` varsa genel `replaceParts` ayarı o kurala uygulanmaz.
  // Önce gelen kural kazanır; bu yüzden kullanıcı kuralları hazır listelerden önce verilmeli.
  function buildMatcher(rules, { replaceParts = true } = {}) {
    const entries = new Map(); // folded real → alias
    for (const r of rules) {
      if (!r || !r.real || !r.alias || r.enabled === false) continue;
      const realParts = r.real.trim().split(/\s+/);
      const aliasParts = r.alias.trim().split(/\s+/);
      const fullKey = realParts.map(fold).join(" ");
      if (!entries.has(fullKey)) entries.set(fullKey, r.alias.trim());
      if (Array.isArray(r.alone)) {
        const foldedParts = realParts.map(fold);
        for (const phrase of r.alone) {
          const words = phrase.trim().split(/\s+/).map(fold);
          const alias = words.map((w) => aliasParts[foldedParts.indexOf(w)]);
          const k = words.join(" ");
          if (alias.every(Boolean) && !entries.has(k)) entries.set(k, alias.join(" "));
        }
      } else if (replaceParts && realParts.length > 1) {
        realParts.forEach((p, i) => {
          const a = i === realParts.length - 1 ? aliasParts[aliasParts.length - 1] : aliasParts[Math.min(i, aliasParts.length - 1)];
          const k = fold(p);
          if (p.length >= 2 && a && !entries.has(k)) entries.set(k, a);
        });
      }
    }
    if (!entries.size) return null;

    // Uzun isimler önce denensin ki "Mehmet Altındal" tek parça yakalansın.
    const keys = [...entries.keys()].sort((a, b) => b.length - a.length);
    const body = keys.map((k) => k.split(" ").map(wordPattern).join("\\s+")).join("|");
    const regex = new RegExp("(?<![\\p{L}\\p{N}_@#])(?:" + body + ")(?![\\p{L}\\p{N}_])", "gu");

    function aliasFor(match) {
      const alias = entries.get(fold(match).replace(/\s+/g, " "));
      if (!alias) return match;
      return matchCase(match, alias);
    }

    function replace(text) {
      let count = 0;
      const out = text.replace(regex, (m) => { count++; return aliasFor(m); });
      return { text: out, count };
    }

    function test(text) {
      regex.lastIndex = 0;
      const r = regex.test(text);
      regex.lastIndex = 0;
      return r;
    }

    return { regex, aliasFor, replace, test };
  }

  // Yazım biçimini korur: "MEHMET" → "MATTHEW", "mehmet" → "matthew".
  function matchCase(source, alias) {
    const letters = source.replace(/[^\p{L}]/gu, "");
    if (letters && letters === letters.toLocaleUpperCase("tr") && letters !== letters.toLocaleLowerCase("tr")) {
      return alias.toUpperCase();
    }
    if (letters && letters === letters.toLocaleLowerCase("tr")) return alias.toLowerCase();
    return alias;
  }

  // Hazır isim listeleri. `alone`: tam isim dışında ayrıca değiştirilecek kısımlar.
  // "Bak", "Kurum", "Özel", "Fidan", "Şimşek", "Mehmet" gibi günlük dilde de geçen
  // kelimeler bilerek tek başına eklenmedi; yalnızca tam isim olarak değiştirilir.
  const PRESETS = {
    trPolitics: {
      label: "Türk siyasetçileri",
      description: "Cumhurbaşkanı, kabine üyeleri ve öne çıkan siyasetçiler (Ekim 2026, kaynak: tccb.gov.tr/kabine).",
      people: [
        // Cumhurbaşkanı ve kabine
        { real: "Recep Tayyip Erdoğan", role: "Cumhurbaşkanı", alone: ["Tayyip Erdoğan", "Erdoğan", "Tayyip"] },
        { real: "Cevdet Yılmaz", role: "Cumhurbaşkanı Yardımcısı" },
        { real: "Akın Gürlek", role: "Adalet Bakanı", alone: ["Gürlek"] },
        { real: "Mahinur Özdemir Göktaş", role: "Aile ve Sosyal Hizmetler Bakanı", alone: ["Mahinur Göktaş", "Mahinur Özdemir"] },
        { real: "Vedat Işıkhan", role: "Çalışma ve Sosyal Güvenlik Bakanı", alone: ["Işıkhan"] },
        { real: "Murat Kurum", role: "Çevre, Şehircilik ve İklim Değişikliği Bakanı" },
        { real: "Hakan Fidan", role: "Dışişleri Bakanı" },
        { real: "Alparslan Bayraktar", role: "Enerji ve Tabii Kaynaklar Bakanı" },
        { real: "Osman Aşkın Bak", role: "Gençlik ve Spor Bakanı", alone: ["Aşkın Bak"] },
        { real: "Mehmet Şimşek", role: "Hazine ve Maliye Bakanı" },
        { real: "Mustafa Çiftçi", role: "İçişleri Bakanı" },
        { real: "Mehmet Nuri Ersoy", role: "Kültür ve Turizm Bakanı", alone: ["Nuri Ersoy"] },
        { real: "Yusuf Tekin", role: "Milli Eğitim Bakanı" },
        { real: "Yaşar Güler", role: "Milli Savunma Bakanı" },
        { real: "Kemal Memişoğlu", role: "Sağlık Bakanı", alone: ["Memişoğlu"] },
        { real: "Mehmet Fatih Kacır", role: "Sanayi ve Teknoloji Bakanı", alone: ["Fatih Kacır", "Kacır"] },
        { real: "İbrahim Yumaklı", role: "Tarım ve Orman Bakanı", alone: ["Yumaklı"] },
        { real: "Ömer Bolat", role: "Ticaret Bakanı" },
        { real: "Abdulkadir Uraloğlu", role: "Ulaştırma ve Altyapı Bakanı", alone: ["Uraloğlu"] },
        // Meclis ve parti liderleri
        { real: "Numan Kurtulmuş", role: "TBMM Başkanı" },
        { real: "Devlet Bahçeli", role: "MHP", alone: ["Bahçeli"] },
        { real: "Özgür Özel", role: "CHP" },
        { real: "Kemal Kılıçdaroğlu", role: "CHP", alone: ["Kılıçdaroğlu"] },
        { real: "Müsavat Dervişoğlu", role: "İYİ Parti", alone: ["Dervişoğlu"] },
        { real: "Tuncer Bakırhan", role: "DEM Parti", alone: ["Bakırhan"] },
        { real: "Tülay Hatimoğulları", role: "DEM Parti", alone: ["Hatimoğulları"] },
        { real: "Fatih Erbakan", role: "Yeniden Refah Partisi" },
        { real: "Ali Babacan", role: "DEVA Partisi", alone: ["Babacan"] },
        { real: "Ahmet Davutoğlu", role: "Gelecek Partisi", alone: ["Davutoğlu"] },
        // Büyükşehir belediye başkanları
        { real: "Ekrem İmamoğlu", role: "İstanbul", alone: ["İmamoğlu"] },
        { real: "Mansur Yavaş", role: "Ankara" }
      ]
    }
  };

  function presetRules(key) {
    const p = PRESETS[key];
    if (!p) return [];
    // Her kişinin takma soyadı benzersiz olsun ki "Everett" kimi kastettiği belirsizleşmesin.
    const usedSurnames = new Set();
    return p.people.map((x) => {
      // İlk isimler sabit kalır (cinsiyet değişmesin), çakışmada yalnızca soyadı değişir.
      let alias = x.alias;
      if (!alias) {
        const parts = x.real.trim().split(/\s+/);
        const first = parts.slice(0, -1).map((w) => aliasForFirst(w, 0));
        const last = parts[parts.length - 1];
        let v = 0;
        while (usedSurnames.has(aliasForSurname(last, v)) && v < 20) v++;
        alias = [...first, aliasForSurname(last, v)].join(" ");
      }
      usedSurnames.add(alias.split(" ").pop());
      // `alone` her zaman dizi olmalı; yoksa genel "parçaları ayrı değiştir" ayarı
      // "Özel", "Kurum" gibi günlük kelimeleri de değiştirir.
      return { ...x, alias, alone: x.alone || [] };
    });
  }

  // Kullanıcı kuralları önce gelir, böylece aynı isim için kullanıcının seçtiği takma ad kazanır.
  function collectRules(settings) {
    const rules = (settings.rules || []).slice();
    const presets = settings.presets || {};
    for (const key in PRESETS) if (presets[key]) rules.push(...presetRules(key));
    return rules;
  }

  const DEFAULT_SETTINGS = {
    enabled: true,
    replaceParts: true,
    liveReplace: true,
    showToast: true,
    rules: [],
    presets: { trPolitics: true },
    disabledSites: []
  };

  root.NameShield = { fold, generateAlias, buildMatcher, matchCase, collectRules, presetRules, PRESETS, DEFAULT_SETTINGS };
})(typeof globalThis !== "undefined" ? globalThis : window);
