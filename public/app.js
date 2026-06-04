/* ================================================================
   TayaranDZ — App Logic v4 (Google Flights / Volz Inspired)
   ================================================================ */
'use strict';

// ===== SVG Icons =====
const IC = {
  check: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  bag:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="7" width="12" height="14" rx="2"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  ref:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1016.5-5H17"/><polyline points="17 3 17 7 21 7"/></svg>`,
  plane: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5c-1.5-1.5-3.5-1.5-5 0L11 6 2.8 4.2c-.5-.1-.9.1-1.1.5L.6 6.1c-.2.4 0 .9.4 1.1L7 9l-2 3H3l-1 1 3 2 2 3 1-1v-2l3-2 1.9 6.2c.2.4.7.6 1.1.4l1.4-.6c.5-.2.7-.6.6-1.1z"/></svg>`,
  clock: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  link:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  ok:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

// ===== i18n =====
const i18n = {
  en: {
    dir:'ltr',
    hero_line1:'Compare flights',hero_line2:' from Algeria',
    hero_subtitle:'Volz & MondialBooking in one place · Pay with CIB or Dahabia',
    pay_cib:'CIB Card',pay_dahabia:'Dahabia',pay_delivery:'Cash delivery',
    label_from:'FROM',label_to:'TO',label_depart:'DEPARTURE',label_return:'RETURN',label_passengers:'PASSENGERS',
    placeholder_from:'City or airport',placeholder_to:'City or airport',
    tab_roundtrip:'Round Trip',tab_oneway:'One Way',btn_search:'Search',
    tab_best:'Best',tab_best_sub:'Price · Duration',
    tab_cheapest:'Cheapest',tab_cheap_sub:'Lowest price',
    tab_fastest:'Fastest',tab_fast_sub:'Shortest duration',
    tab_direct:'Direct',tab_direct_sub:'Non-stop only',
    filter_direct:'Non-stop',filter_1stop:'Max 1 stop',filter_luggage:'Luggage included',filter_airlines:'Airlines',
    results_title:'Available Flights',results_found:'results',
    book_volz:'Volz.app',book_mondial:'MondialBooking',
    best_deal:'Best price',
    stops_direct:'Non-stop',stops_1:'1 stop',stops_2:'2 stops',
    tag_luggage:'Carry-on',tag_refundable:'Refundable',
    popular_eyebrow:'Popular destinations',popular_title1:'Most',popular_title2:' booked routes',
    from_price:'from',
    footer_desc:'Compare Volz and MondialBooking flight prices from Algeria. Pay with CIB, Dahabia, or cash delivery.',
    footer_providers:'Partners',footer_routes:'Destinations',
    footer_rights:'© 2026 TayaranDZ',
    no_results_title:'No flights found',no_results_sub:'Try different airports or dates',
    toast_redirect:'Opening booking site',
    economy:'Economy',premium:'Premium Economy',business:'Business',first:'First',
    adult:'adult',adults:'adults',cabin:'Class',
    all_airports:'All airports',
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    weekdays: ['S','M','T','W','T','F','S'],
  },
  fr: {
    dir:'ltr',
    hero_line1:'Comparez les vols',hero_line2:' depuis l\'Algérie',
    hero_subtitle:'Volz & MondialBooking en un seul endroit · Paiement CIB et Dahabia',
    pay_cib:'Carte CIB',pay_dahabia:'Dahabia',pay_delivery:'Livraison',
    label_from:'DÉPART',label_to:'DESTINATION',label_depart:'DATE DÉPART',label_return:'DATE RETOUR',label_passengers:'PASSAGERS',
    placeholder_from:'Ville ou aéroport',placeholder_to:'Ville ou aéroport',
    tab_roundtrip:'Aller-Retour',tab_oneway:'Aller Simple',btn_search:'Rechercher',
    tab_best:'Meilleur',tab_best_sub:'Prix · Durée',
    tab_cheapest:'Moins cher',tab_cheap_sub:'Prix le plus bas',
    tab_fastest:'Plus rapide',tab_fast_sub:'Durée la plus courte',
    tab_direct:'Direct',tab_direct_sub:'Sans escale uniquement',
    filter_direct:'Sans escale',filter_1stop:'Max 1 escale',filter_luggage:'Bagage inclus',filter_airlines:'Compagnies',
    results_title:'Vols disponibles',results_found:'résultats',
    book_volz:'Volz.app',book_mondial:'MondialBooking',
    best_deal:'Meilleur prix',
    stops_direct:'Sans escale',stops_1:'1 escale',stops_2:'2 escales',
    tag_luggage:'Bagage cabine',tag_refundable:'Remboursable',
    popular_eyebrow:'Destinations populaires',popular_title1:'Routes',popular_title2:' les plus réservées',
    from_price:'à partir de',
    footer_desc:'Comparez les vols Volz et MondialBooking depuis l\'Algérie. Paiement CIB, Dahabia et livraison.',
    footer_providers:'Partenaires',footer_routes:'Destinations',
    footer_rights:'© 2026 TayaranDZ — Tous droits réservés.',
    no_results_title:'Aucun vol trouvé',no_results_sub:'Essayez d\'autres aéroports ou dates',
    toast_redirect:'Ouverture du site de réservation',
    economy:'Économique',premium:'Éco Premium',business:'Business',first:'Première',
    adult:'adulte',adults:'adultes',cabin:'Classe',
    all_airports:'Tous les aéroports',
    months: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
    weekdays: ['D','L','M','M','J','V','S'],
  },
  ar: {
    dir:'rtl',
    hero_line1:'قارن أسعار الرحلات',hero_line2:' من الجزائر',
    hero_subtitle:'فولز وموندياليوكينج في مكان واحد · الدفع بـ CIB أو الداهابية',
    pay_cib:'بطاقة CIB',pay_dahabia:'داهابية',pay_delivery:'الدفع عند التسليم',
    label_from:'المغادرة',label_to:'الوجهة',label_depart:'تاريخ المغادرة',label_return:'تاريخ العودة',label_passengers:'المسافرون',
    placeholder_from:'مدينة أو مطار',placeholder_to:'مدينة أو مطار',
    tab_roundtrip:'ذهاب وإياب',tab_oneway:'ذهاب فقط',btn_search:'بحث',
    tab_best:'الأفضل',tab_best_sub:'السعر · المدة',
    tab_cheapest:'الأرخص',tab_cheap_sub:'أقل سعر',
    tab_fastest:'الأسرع',tab_fast_sub:'أقصر رحلة',
    tab_direct:'مباشر',tab_direct_sub:'بدون توقف',
    filter_direct:'مباشر',filter_1stop:'توقف واحد كحد أقصى',filter_luggage:'أمتعة مشمولة',filter_airlines:'الشركات',
    results_title:'الرحلات المتاحة',results_found:'نتيجة',
    book_volz:'فولز',book_mondial:'موندياليوكينج',
    best_deal:'أفضل سعر',
    stops_direct:'مباشر',stops_1:'توقف واحد',stops_2:'توقفان',
    tag_luggage:'حقيبة مقصورة',tag_refundable:'قابل للاسترداد',
    popular_eyebrow:'الوجهات الشائعة',popular_title1:'الوجهات',popular_title2:' الأكثر حجزاً',
    from_price:'ابتداءً من',
    footer_desc:'قارن رحلات فولز وموندياليوكينج من الجزائر. الدفع بـ CIB والداهابية وعند التسليم.',
    footer_providers:'الشركاء',footer_routes:'الوجهات',
    footer_rights:'© 2026 TayaranDZ — جميع الحقوق محفوظة.',
    no_results_title:'لا توجد رحلات',no_results_sub:'جرب مطارات أو تواريخ مختلفة',
    toast_redirect:'فتح موقع الحجز',
    economy:'اقتصادية',premium:'اقتصادية مميزة',business:'أعمال',first:'أولى',
    adult:'بالغ',adults:'بالغون',cabin:'الدرجة',
    all_airports:'جميع المطارات',
    months: ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    weekdays: ['ح','ن','ث','ر','خ','ج','س'],
  }
};

// ===== Airports =====
const airports = [
  {
    iata: 'ALG',
    city: { en: 'Algiers', fr: 'Alger', ar: 'الجزائر' },
    name: { en: 'Houari Boumediene Airport', fr: 'Aéroport Houari Boumédiène', ar: 'مطار هواري بومدين الدولي' }
  },
  {
    iata: 'ORN',
    city: { en: 'Oran', fr: 'Oran', ar: 'وهران' },
    name: { en: 'Ahmed Ben Bella Airport', fr: 'Aéroport d\'Oran - Ahmed Ben Bella', ar: 'مطار أحمد بن بلة' }
  },
  {
    iata: 'CZL',
    city: { en: 'Constantine', fr: 'Constantine', ar: 'قسنطينة' },
    name: { en: 'Mohamed Boudiaf Airport', fr: 'Aéroport Mohamed Boudiaf', ar: 'مطار محمد بوضياف الدولي' }
  },
  {
    iata: 'AAE',
    city: { en: 'Annaba', fr: 'Annaba', ar: 'عنابة' },
    name: { en: 'Rabah Bitat Airport', fr: 'Aéroport Rabah Bitat', ar: 'مطار رابح بيطاط' }
  },
  {
    iata: 'TLM',
    city: { en: 'Tlemcen', fr: 'Tlemcen', ar: 'تلمسان' },
    name: { en: 'Zenata - Messali El Hadj Airport', fr: 'Aéroport Messali El Hadj', ar: 'مطار مصالي الحاج' }
  },
  {
    iata: 'BJA',
    city: { en: 'Bejaia', fr: 'Béjaïa', ar: 'بجاية' },
    name: { en: 'Abane Ramdane Airport', fr: 'Aéroport Soummam - Abane Ramdane', ar: 'مطار عبان رمضان' }
  },
  {
    iata: 'BLJ',
    city: { en: 'Batna', fr: 'Batna', ar: 'باتنة' },
    name: { en: 'Mostefa Ben Boulaid Airport', fr: 'Aéroport Mostefa Ben Boulaïd', ar: 'مطار مصطفى بن بولعيد' }
  },
  {
    iata: 'TMR',
    city: { en: 'Tamanrasset', fr: 'Tamanrasset', ar: 'تمنراست' },
    name: { en: 'Aguenar Airport', fr: 'Aéroport Aguenar - Hadj Bey Akhamok', ar: 'مطار الحاج باي أق أخاموك' }
  },
  {
    iata: 'HME',
    city: { en: 'Hassi Messaoud', fr: 'Hassi Messaoud', ar: 'حاسي مسعود' },
    name: { en: 'Oued Irara Airport', fr: 'Aéroport Oued Irara - Krim Belkacem', ar: 'مطار كريم بلقاسم' }
  },
  {
    iata: 'GHA',
    city: { en: 'Ghardaia', fr: 'Ghardaïa', ar: 'غرداية' },
    name: { en: 'Moufdi Zakaria Airport', fr: 'Aéroport Noumérat - Moufdi Zakaria', ar: 'مطار مفدي زكريا' }
  },
  {
    iata: 'ELU',
    city: { en: 'El Oued', fr: 'El Oued', ar: 'الوادي' },
    name: { en: 'Guemar Airport', fr: 'Aéroport de Guemar', ar: 'مطار قمار' }
  },
  {
    iata: 'AZR',
    city: { en: 'Adrar', fr: 'Adrar', ar: 'أدرار' },
    name: { en: 'Touat Cheikh Sidi Mohamed Belkebir Airport', fr: 'Aéroport de Touat - Cheikh Sidi Mohamed Belkebir', ar: 'مطار الشيخ سيدي محمد بن لكبير' }
  },
  {
    iata: 'TGR',
    city: { en: 'Touggourt', fr: 'Touggourt', ar: 'تقرت' },
    name: { en: 'Sidi Madhi Airport', fr: 'Aéroport Sidi Madhi', ar: 'مطار سيدي مهدي' }
  },
  {
    iata: 'BMW',
    city: { en: 'Bordj Badji Mokhtar', fr: 'Bordj Badji Mokhtar', ar: 'برج باجي مختار' },
    name: { en: 'Bordj Badji Mokhtar Airport', fr: 'Aéroport de Bordj Badji Mokhtar', ar: 'مطار برج باجي مختار' }
  },
  {
    iata: 'CDG',
    city: { en: 'Paris', fr: 'Paris', ar: 'باريس' },
    name: { en: 'Charles de Gaulle Airport', fr: 'Aéroport Charles de Gaulle', ar: 'مطار شارل ديغول' }
  },
  {
    iata: 'ORY',
    city: { en: 'Paris', fr: 'Paris', ar: 'باريس' },
    name: { en: 'Orly Airport', fr: 'Aéroport de Paris-Orly', ar: 'مطار أورلي' }
  },
  {
    iata: 'LYS',
    city: { en: 'Lyon', fr: 'Lyon', ar: 'ليون' },
    name: { en: 'Saint-Exupéry Airport', fr: 'Aéroport de Lyon-Saint-Exupéry', ar: 'مطار سانت إكسوبيري' }
  },
  {
    iata: 'MRS',
    city: { en: 'Marseille', fr: 'Marseille', ar: 'مرسيليا' },
    name: { en: 'Provence Airport', fr: 'Aéroport de Marseille-Provence', ar: 'مطار مارسيليا بروفنس' }
  },
  {
    iata: 'LHR',
    city: { en: 'London', fr: 'Londres', ar: 'لندن' },
    name: { en: 'Heathrow Airport', fr: 'Aéroport de Londres-Heathrow', ar: 'مطار هيثرو' }
  },
  {
    iata: 'IST',
    city: { en: 'Istanbul', fr: 'Istanbul', ar: 'إسطنبول' },
    name: { en: 'Istanbul Airport', fr: 'Aéroport d\'Istanbul', ar: 'مطار إسطنبول الدولي' }
  },
  {
    iata: 'SAW',
    city: { en: 'Istanbul', fr: 'Istanbul', ar: 'إسطنبول' },
    name: { en: 'Sabiha Gökçen Airport', fr: 'Aéroport Sabiha-Gökçen', ar: 'مطار صبيحة كوكجن الدولي' }
  },
  {
    iata: 'DXB',
    city: { en: 'Dubai', fr: 'Dubaï', ar: 'دبي' },
    name: { en: 'Dubai International Airport', fr: 'Aéroport de Doubaï', ar: 'مطار دبي الدولي' }
  },
  {
    iata: 'CAI',
    city: { en: 'Cairo', fr: 'Le Caire', ar: 'القاهرة' },
    name: { en: 'Cairo International Airport', fr: 'Aéroport du Caire', ar: 'مطار القاهرة الدولي' }
  },
  {
    iata: 'TUN',
    city: { en: 'Tunis', fr: 'Tunis', ar: 'تونس' },
    name: { en: 'Carthage Airport', fr: 'Aéroport de Tunis-Carthage', ar: 'مطار تونس قرطاج الدولي' }
  },
  {
    iata: 'FCO',
    city: { en: 'Rome', fr: 'Rome', ar: 'روما' },
    name: { en: 'Fiumicino Airport', fr: 'Aéroport de Rome-Fiumicino', ar: 'مطار ليوناردو دا فينشي' }
  },
  {
    iata: 'MAD',
    city: { en: 'Madrid', fr: 'Madrid', ar: 'مدريد' },
    name: { en: 'Barajas Airport', fr: 'Aéroport de Madrid-Barajas', ar: 'مطار مدريد باراخاس الدولي' }
  },
  {
    iata: 'BCN',
    city: { en: 'Barcelona', fr: 'Barcelone', ar: 'برشلونة' },
    name: { en: 'El Prat Airport', fr: 'Aéroport de Barcelone-El Prat', ar: 'مطار برشلونة الدولي' }
  },
  {
    iata: 'FRA',
    city: { en: 'Frankfurt', fr: 'Francfort', ar: 'فرانكفورت' },
    name: { en: 'Frankfurt Airport', fr: 'Aéroport de Francfort-sur-le-Main', ar: 'مطار فرانكفورت الدولي' }
  },
  {
    iata: 'DOH',
    city: { en: 'Doha', fr: 'Doha', ar: 'الدوحة' },
    name: { en: 'Hamad International Airport', fr: 'Aéroport de Hamad', ar: 'مطار حمد الدولي' }
  },
  {
    iata: 'YUL',
    city: { en: 'Montreal', fr: 'Montréal', ar: 'مونتريال' },
    name: { en: 'Pierre Elliott Trudeau Airport', fr: 'Aéroport Pierre-Elliott-Trudeau', ar: 'مطار بيير إليوت ترودو الدولي' }
  },
  {
    iata: 'JFK',
    city: { en: 'New York', fr: 'New York', ar: 'نيويورك' },
    name: { en: 'John F. Kennedy Airport', fr: 'Aéroport John F. Kennedy', ar: 'مطار جون إف كينيدي الدولي' }
  },
  {
    iata: 'MED',
    city: { en: 'Medina', fr: 'Médine', ar: 'المدينة المنورة' },
    name: { en: 'Prince Mohammad Bin Abdulaziz Airport', fr: 'Aéroport Prince Mohammad Bin Abdulaziz', ar: 'مطار الأمير محمد بن عبد العزيز الدولي' }
  },
  {
    iata: 'JED',
    city: { en: 'Jeddah', fr: 'Djeddah', ar: 'جدة' },
    name: { en: 'King Abdulaziz Airport', fr: 'Aéroport du Roi Abdulaziz', ar: 'مطار الملك عبد العزيز الدولي' }
  },
  {
    iata: 'BRU',
    city: { en: 'Brussels', fr: 'Bruxelles', ar: 'بروكسل' },
    name: { en: 'Brussels Airport', fr: 'Aéroport de Bruxelles-National', ar: 'مطار بروكسل الدولي' }
  }
];

const localAirlines = {
  AH:{name:'Air Algérie',     logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/AH.png'},
  AF:{name:'Air France',      logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/AF.png'},
  TK:{name:'Turkish Airlines',logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/TK.png'},
  EK:{name:'Emirates',        logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/EK.png'},
  QR:{name:'Qatar Airways',   logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/QR.png'},
  LH:{name:'Lufthansa',       logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/LH.png'},
  TU:{name:'Tunisair',        logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/TU.png'},
  MS:{name:'EgyptAir',        logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/MS.png'},
  IB:{name:'Iberia',          logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/IB.png'},
  VY:{name:'Vueling',         logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/VY.png'},
  PC:{name:'Pegasus',         logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/PC.png'},
  AZ:{name:'ITA Airways',     logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/AZ.png'},
  BJ:{name:'Nouvelair',       logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/BJ.png'},
  SF:{name:'Tassili Airlines',logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/SF.png'},
  XX:{name:'Unknown Airline', logo:'https://www.gstatic.com/flights/airline_logos/70px/dark/XX.png'}
};

const airlines = { ...localAirlines };
if (window.globalAirlinesData) {
  Object.keys(window.globalAirlinesData).forEach(code => {
    if (!airlines[code]) {
      airlines[code] = {
        name: window.globalAirlinesData[code],
        logo: `https://www.gstatic.com/flights/airline_logos/70px/dark/${code}.png`
      };
    }
  });
}

const mockFlights = [
  {id:'f01',airline:'AH',flightNo:'AH 1014',origin:'ALG',destination:'CDG',departure:'06:30',arrival:'09:55',duration:'3h 25m',stops:0,stopInfo:null,prices:{volz:38900,mondial:41500},hasLuggage:true,isRefundable:false},
  {id:'f02',airline:'AF',flightNo:'AF 1232',origin:'ALG',destination:'CDG',departure:'10:15',arrival:'13:50',duration:'3h 35m',stops:0,stopInfo:null,prices:{volz:52400,mondial:49800},hasLuggage:true,isRefundable:true},
  {id:'f03',airline:'TK',flightNo:'TK 625', origin:'ALG',destination:'CDG',departure:'07:00',arrival:'16:45',duration:'9h 45m',stops:1,stopInfo:'IST',prices:{volz:29500,mondial:31200},hasLuggage:true,isRefundable:false},
  {id:'f04',airline:'AH',flightNo:'AH 2072',origin:'ALG',destination:'LHR',departure:'08:45',arrival:'13:20',duration:'4h 35m',stops:0,stopInfo:null,prices:{volz:47200,mondial:45900},hasLuggage:true,isRefundable:false},
  {id:'f05',airline:'EK',flightNo:'EK 741', origin:'ALG',destination:'DXB',departure:'23:55',arrival:'09:30+1',duration:'6h 35m',stops:0,stopInfo:null,prices:{volz:61800,mondial:65000},hasLuggage:true,isRefundable:true},
  {id:'f06',airline:'QR',flightNo:'QR 1403',origin:'ALG',destination:'DOH',departure:'02:30',arrival:'09:00',duration:'6h 30m',stops:0,stopInfo:null,prices:{volz:58500,mondial:60200},hasLuggage:true,isRefundable:false},
  {id:'f07',airline:'LH',flightNo:'LH 5602',origin:'ALG',destination:'FRA',departure:'12:10',arrival:'16:55',duration:'4h 45m',stops:0,stopInfo:null,prices:{volz:55100,mondial:52800},hasLuggage:false,isRefundable:false},
  {id:'f08',airline:'TK',flightNo:'TK 621', origin:'ALG',destination:'IST',departure:'14:30',arrival:'20:15',duration:'5h 45m',stops:0,stopInfo:null,prices:{volz:33400,mondial:35100},hasLuggage:true,isRefundable:false},
  {id:'f09',airline:'AH',flightNo:'AH 1108',origin:'ALG',destination:'MRS',departure:'09:00',arrival:'11:10',duration:'2h 10m',stops:0,stopInfo:null,prices:{volz:24600,mondial:26900},hasLuggage:false,isRefundable:false},
  {id:'f10',airline:'MS',flightNo:'MS 841', origin:'ALG',destination:'CAI',departure:'16:20',arrival:'21:30',duration:'5h 10m',stops:0,stopInfo:null,prices:{volz:36700,mondial:34500},hasLuggage:true,isRefundable:false},
  {id:'f11',airline:'IB',flightNo:'IB 3472',origin:'ALG',destination:'MAD',departure:'11:30',arrival:'14:45',duration:'3h 15m',stops:0,stopInfo:null,prices:{volz:31900,mondial:30600},hasLuggage:false,isRefundable:true},
  {id:'f12',airline:'TU',flightNo:'TU 744', origin:'ALG',destination:'TUN',departure:'08:00',arrival:'09:20',duration:'1h 20m',stops:0,stopInfo:null,prices:{volz:14200,mondial:15800},hasLuggage:false,isRefundable:false},
  {id:'f13',airline:'VY',flightNo:'VY 6260',origin:'ALG',destination:'BCN',departure:'13:45',arrival:'17:00',duration:'3h 15m',stops:0,stopInfo:null,prices:{volz:28300,mondial:29900},hasLuggage:false,isRefundable:false},
  {id:'f14',airline:'PC',flightNo:'PC 1208',origin:'ORN',destination:'IST',departure:'06:15',arrival:'12:30',duration:'6h 15m',stops:0,stopInfo:null,prices:{volz:30100,mondial:32400},hasLuggage:false,isRefundable:false},
  {id:'f15',airline:'AH',flightNo:'AH 3022',origin:'CZL',destination:'CDG',departure:'07:45',arrival:'11:30',duration:'3h 45m',stops:0,stopInfo:null,prices:{volz:41300,mondial:43700},hasLuggage:true,isRefundable:false},
  {id:'f16',airline:'AF',flightNo:'AF 2210',origin:'ALG',destination:'LYS',departure:'17:00',arrival:'20:20',duration:'3h 20m',stops:0,stopInfo:null,prices:{volz:43500,mondial:41200},hasLuggage:true,isRefundable:true},
  {id:'f17',airline:'EK',flightNo:'EK 742', origin:'ALG',destination:'DXB',departure:'14:00',arrival:'23:25',duration:'6h 25m',stops:0,stopInfo:null,prices:{volz:59900,mondial:62100},hasLuggage:true,isRefundable:false},
  {id:'f18',airline:'TK',flightNo:'TK 3841',origin:'ALG',destination:'FRA',departure:'07:00',arrival:'15:20',duration:'8h 20m',stops:1,stopInfo:'IST',prices:{volz:37600,mondial:36100},hasLuggage:true,isRefundable:false},
  {id:'f19',airline:'AH',flightNo:'AH 1016',origin:'ALG',destination:'CDG',departure:'18:30',arrival:'21:55',duration:'3h 25m',stops:0,stopInfo:null,prices:{volz:40100,mondial:38700},hasLuggage:true,isRefundable:false},
  {id:'f20',airline:'QR',flightNo:'QR 1404',origin:'ORN',destination:'DOH',departure:'22:00',arrival:'05:30+1',duration:'6h 30m',stops:0,stopInfo:null,prices:{volz:57200,mondial:59800},hasLuggage:true,isRefundable:true},
];

const popularRoutes = [
  {o:'ALG',d:'CDG',oc:{en:'Algiers',fr:'Alger',ar:'الجزائر'},dc:{en:'Paris',fr:'Paris',ar:'باريس'},p:29500},
  {o:'ALG',d:'IST',oc:{en:'Algiers',fr:'Alger',ar:'الجزائر'},dc:{en:'Istanbul',fr:'Istanbul',ar:'إسطنبول'},p:33400},
  {o:'ALG',d:'DXB',oc:{en:'Algiers',fr:'Alger',ar:'الجزائر'},dc:{en:'Dubai',fr:'Dubaï',ar:'دبي'},p:59900},
  {o:'ALG',d:'LHR',oc:{en:'Algiers',fr:'Alger',ar:'الجزائر'},dc:{en:'London',fr:'Londres',ar:'لندن'},p:45900},
  {o:'ALG',d:'BCN',oc:{en:'Algiers',fr:'Alger',ar:'الجزائر'},dc:{en:'Barcelona',fr:'Barcelone',ar:'برشلونة'},p:28300},
  {o:'ALG',d:'TUN',oc:{en:'Algiers',fr:'Alger',ar:'الجزائر'},dc:{en:'Tunis',fr:'Tunis',ar:'تونس'},p:14200},
  {o:'ORN',d:'CDG',oc:{en:'Oran',fr:'Oran',ar:'وهران'},dc:{en:'Paris',fr:'Paris',ar:'باريس'},p:35600},
  {o:'ALG',d:'MAD',oc:{en:'Algiers',fr:'Alger',ar:'الجزائر'},dc:{en:'Madrid',fr:'Madrid',ar:'مدريد'},p:30600},
];

// ===== State =====
const state = {
  lang: 'fr',
  tripType: 'roundtrip',
  searchDone: false,
  flights: [],       // Processed base flights
  filtered: [],      // After filters/sorts applied
  rawFlights: [],    // Stored raw output for dynamic tab swapping
  visibleCount: 15,  // Pagination for results
  expandedFlightId: null, // Currently open flight card

  // Sort
  sortBy: 'best',

  // Filters
  filterStops: 'all', // all, direct, 1stop
  filterLuggage: false,
  filterAirlines: []
};
const $ = id => document.getElementById(id);
let globalAirports = [];
const getApt = iata => (globalAirports.find(a => a.iata === iata) || airports.find(a => a.iata === iata));
const minPrice = f => {
  if (!f || !f.prices) return Infinity;
  const active = Object.values(f.prices).filter(p => p !== null && p !== undefined && p > 0);
  return active.length > 0 ? Math.min(...active) : Infinity;
};
const parseDur = s => (parseInt(s)||0)*60 + (parseInt(s.split('h')[1])||0);

// ===== Helper for Input Value Formatting =====
function setInputValue(inputId, iata) {
  const input = $(inputId);
  if (!input) return;
  const apt = getApt(iata);
  if (apt) {
    input.value = `${apt.city[state.lang]} (${apt.iata})`;
  } else {
    input.value = iata;
  }
}

// ===== Lang =====
function setLang(lang) {
  state.lang = lang;
  const t = i18n[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = t.dir;
  document.querySelectorAll('[data-i18n]').forEach(el => { if(t[el.dataset.i18n]!=null) el.textContent=t[el.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { if(t[el.dataset.i18nPh]!=null) el.placeholder=t[el.dataset.i18nPh]; });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang===lang));
  
  // Format current inputs in the new language
  const currentFrom = ($('input-from')?.value || '').match(/\(([A-Z]{3})\)/)?.[1] || 'ALG';
  const currentTo = ($('input-to')?.value || '').match(/\(([A-Z]{3})\)/)?.[1] || 'CDG';
  setInputValue('input-from', currentFrom);
  setInputValue('input-to', currentTo);

  renderPopular();
  renderAirlineFilterCards();
  if(state.searchDone) renderFlights();
  updatePax();
  if (typeof updateDateInputs === 'function') updateDateInputs();
}

// ===== Trip type =====
function setTripType(type) {
  state.tripType = type;
  document.querySelectorAll('.trip-tab').forEach(b => b.classList.toggle('active', b.dataset.trip===type));
  const sf = $('return-sf');
  const fields = document.querySelector('.search-fields');
  if (fields) {
    if (type === 'oneway') {
      fields.classList.add('oneway-mode');
    } else {
      fields.classList.remove('oneway-mode');
    }
  }
  if(sf) { sf.style.opacity = type==='oneway'?'0.35':'1'; sf.style.pointerEvents = type==='oneway'?'none':''; }
  if (typeof updateDateInputs === 'function') updateDateInputs();
  if ($('cal-dropdown')?.classList.contains('open')) {
    renderCalendar();
  }

  // Re-process active flights on dynamic tab toggle!
  if (state.searchDone && state.rawFlights && state.rawFlights.length > 0) {
    state.flights = processFlights(state.rawFlights);
    renderAirlineFilterCards();
    applySort();
  }
}

// ===== Swap =====
function swapAirports() {
  const f=$('input-from'),t=$('input-to');
  if(!f||!t) return;
  [f.value,t.value]=[t.value,f.value];
}

// ===== Pax =====
function togglePax(){ $('pax-popup')?.classList.toggle('open'); }
function updatePax() {
  const a=parseInt($('pax-adults')?.value)||1;
  const c=parseInt($('pax-children')?.value)||0;
  const cab=$('pax-cabin')?.value||'economy';
  const t=i18n[state.lang];
  const d=$('pax-display');
  const cabStr={economy:t.economy,premium:t.premium,business:t.business,first:t.first}[cab]||cab;
  if(d) d.textContent=`${a+(c>0?'+'+c:'')} ${a===1?t.adult:t.adults} · ${cabStr}`;
}

// ===== Sort tab prices =====
// ===== Airline Filter Cards =====
function renderAirlineFilterCards() {
  const row = document.getElementById('airline-filter-row');
  if (!row || !state.flights.length) { if(row) row.innerHTML=''; return; }

  // Group cheapest price per airline across all flights
  const airlineMap = new Map();
  state.flights.forEach(f => {
    const code = f.airline || 'XX';
    const price = minPrice(f);
    if (!airlineMap.has(code) || price < airlineMap.get(code).price) {
      const al = airlines[code] || { name: code, logo: 'https://static.volz.app/assets/logos/airline_banners/' + code + '.png' };
      airlineMap.set(code, { code, price, name: al.name, logo: al.logo });
    }
  });

  // Sort cards cheapest first
  const sorted = Array.from(airlineMap.values()).sort((a,b) => a.price - b.price);

  row.innerHTML = sorted.map(al => {
    const isActive = state.filterAirlines.includes(al.code);
    const priceStr = al.price.toLocaleString() + ' DZD';
    return `
      <button class="al-filter-card${isActive ? ' active' : ''}" onclick="filterByAirline('${al.code}')" aria-label="${al.name}" title="${al.name}">
        <div class="al-filter-logo-wrap">
          <img class="al-filter-logo" src="${al.logo}" alt="${al.name}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <span class="al-filter-logo-fb" style="display:none">${al.code}</span>
        </div>
        <div class="al-filter-info">
          <div class="al-filter-name">${al.name}</div>
          <div class="al-filter-price">${priceStr}</div>
        </div>
      </button>
    `;
  }).join('');
}

function filterByAirline(code) {
  const idx = state.filterAirlines.indexOf(code);
  if (idx === -1) {
    state.filterAirlines.push(code);
  } else {
    state.filterAirlines.splice(idx, 1);
  }
  renderAirlineFilterCards(); // update active states
  state.visibleCount = 15;
  applySort();
}

// ===== Process Roundtrip Flights Helper =====
function processFlights(rawList) {
  if (state.tripType === 'roundtrip') {
    return rawList.map(f => {
      if (f.isRoundTrip && f.outbound && f.returnLeg) {
        return {
          ...f,
          duration: f.outbound.duration || '0h',
          outbound: {
            ...f.outbound,
            airline: f.airline,
            stops: f.outbound.stops !== undefined ? f.outbound.stops : f.stops,
            hasLuggage: f.hasLuggage
          },
          returnLeg: {
            ...f.returnLeg,
            airline: f.airline,
            stops: f.returnLeg.stops !== undefined ? f.returnLeg.stops : f.stops,
            hasLuggage: f.hasLuggage
          }
        };
      }
      return f;
    }).filter(f => f.isRoundTrip && f.returnLeg);
  } else {
    return rawList.map(f => {
      if (f.outbound) {
        return {
          ...f, // Keep root properties (airline, stops, hasLuggage)
          ...f.outbound, // Spread outbound properties (origin, destination, departure, arrival, duration, flightNo)
          id: f.id,
          prices: f.prices,
          isRoundTrip: false
        };
      }
      return { ...f, isRoundTrip: false };
    });
  }
}

// Helper to extract IATA from raw input if user doesn't tap autocomplete
function extractIATA(val) {
  if (!val) return '';
  const match = val.match(/\(([A-Z]{3})\)/);
  if (match) return match[1].toUpperCase();
  
  const cleanVal = val.trim().toLowerCase();
  if (!cleanVal) return '';

  const db = globalAirports.length > 0 ? globalAirports : airports;
  
  if (cleanVal.length === 3) {
    const exact = db.find(a => a.iata.toLowerCase() === cleanVal);
    if (exact) return exact.iata;
  }
  
  const cityMatch = db.find(a => 
    (a.city.fr && a.city.fr.toLowerCase() === cleanVal) ||
    (a.city.en && a.city.en.toLowerCase() === cleanVal) ||
    (a.city.ar && a.city.ar === cleanVal)
  );
  if (cityMatch) return cityMatch.iata;
  
  return val.toUpperCase().trim();
}

// ===== Search =====
let activeEventSource = null;

async function doSearch() {
  const from = extractIATA($('input-from')?.value);
  const to = extractIATA($('input-to')?.value);
  
  if (!from || !to) return;
  
  // Reveal the main results section now that a search is starting
  const mainEl = document.querySelector('.main');
  if (mainEl) mainEl.style.display = 'block';

  showSkeletons(5);
  state.searchDone = true;
  state.rawFlights = [];
  state.flights = [];
  state.filtered = [];
  
  const cnt = $('results-count');
  if (cnt) cnt.innerHTML = `<svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>`;

  const departStr = toDateString(calendarState.departDate);
  const returnStr = state.tripType === 'roundtrip' ? toDateString(calendarState.returnDate) : '';
  const adults = parseInt($('pax-adults')?.value) || 1;
  const children = parseInt($('pax-children')?.value) || 0;
  const totalPax = adults + children;
  
  if (activeEventSource) {
    activeEventSource.close();
  }

  const url = `/api/flights/stream?from=${from}&to=${to}&departDate=${departStr}&returnDate=${returnStr}&pax=${totalPax}`;
  activeEventSource = new EventSource(url);

  activeEventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'update') {
        state.rawFlights = payload.data;
        state.flights = processFlights(payload.data);
        renderAirlineFilterCards();
        applySort();
      } else if (payload.type === 'done') {
        activeEventSource.close();
        activeEventSource = null;
        if (state.rawFlights.length === 0) {
          applySort(); // will trigger no-results screen
        } else {
          // Final render to remove loading indicators
          applySort();
        }
      } else if (payload.type === 'error') {
        console.error('[Aggregator SSE Error]', payload.message);
        activeEventSource.close();
        activeEventSource = null;
        applySort();
      }
    } catch (e) {
      console.error('Failed to parse SSE message', e);
    }
  };

  activeEventSource.onerror = (err) => {
    console.error('[Aggregator Client] SSE connection error', err);
    activeEventSource.close();
    activeEventSource = null;
    applySort();
  };
}

// ===== Sort =====
function applySort() {
  let r=[...state.flights];
  if(state.filterStops==='direct') r=r.filter(f=>f.stops===0);
  else if(state.filterStops==='1stop') r=r.filter(f=>f.stops<=1);
  if(state.filterLuggage) r=r.filter(f=>f.hasLuggage);

  // Airline company filter
  if (state.filterAirlines && state.filterAirlines.length > 0) {
    r = r.filter(f => {
      const carrier = f.isRoundTrip ? f.outbound.airline : f.airline;
      return state.filterAirlines.includes(carrier);
    });
  }

  if (state.sortBy === 'best') {
    r.sort((a, b) => {
      // 1. Prioritize fewer stops (direct flight first!)
      if (a.stops !== b.stops) {
        return a.stops - b.stops;
      }
      // 2. Tie-breaker: cheaper price first
      const priceDiff = minPrice(a) - minPrice(b);
      if (priceDiff !== 0) return priceDiff;

      // 3. Second tie-breaker: shorter duration first
      return parseDur(a.duration) - parseDur(b.duration);
    });
  } else if (state.sortBy === 'cheapest') {
    r.sort((a, b) => minPrice(a) - minPrice(b));
  } else if (state.sortBy === 'fastest') {
    r.sort((a, b) => parseDur(a.duration) - parseDur(b.duration));
  } else if (state.sortBy === 'stops') {
    r.sort((a, b) => a.stops - b.stops);
  }

  state.filtered=r;
  state.visibleCount = 15;
  renderFlights();
}

function setSort(sortBy, tabId) {
  state.sortBy=sortBy;
  document.querySelectorAll('.sort-tab').forEach(b=>b.classList.toggle('active', b.dataset.sort===sortBy));
  applySort();
}

function setFilter(type,val) {
  if(type==='stops') state.filterStops=state.filterStops===val?'all':val;
  else if(type==='luggage') state.filterLuggage=!state.filterLuggage;
  document.querySelectorAll('.fchip').forEach(c=>{
    if(c.dataset.filter==='stops')   c.classList.toggle('active',c.dataset.val===state.filterStops);
    if(c.dataset.filter==='luggage') c.classList.toggle('active',state.filterLuggage);
  });
  applySort();
}

// ===== Render cards =====
function renderFlights() {
  const c=$('flights-container'), cnt=$('results-count');
  const t=i18n[state.lang];
  if(!c) return;
  if(!state.filtered.length) {
    c.innerHTML=`<div class="no-results">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5c-1.5-1.5-3.5-1.5-5 0L11 6 2.8 4.2c-.5-.1-.9.1-1.1.5L.6 6.1c-.2.4 0 .9.4 1.1L7 9l-2 3H3l-1 1 3 2 2 3 1-1v-2l3-2 1.9 6.2c.2.4.7.6 1.1.4l1.4-.6c.5-.2.7-.6.6-1.1z"/></svg>
      <h3>${t.no_results_title}</h3><p>${t.no_results_sub}</p></div>`;
    if(cnt) cnt.textContent='';
    return;
  }
  if(cnt) {
    cnt.innerHTML = `${state.filtered.length} ${t.results_found}` + (activeEventSource ? ` <span style="margin-left: 8px;"><svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg></span>` : '');
  }
  
  const visibleFlights = state.filtered.slice(0, state.visibleCount);
  
  // Smoothly update the container to prevent violent blinking
  const newHtml = visibleFlights.map((f,i) => buildCard(f,i)).join('');
  
  // If we are currently streaming and the container already has content, use a lightweight DOM replacement
  if (activeEventSource && c.children.length > 0) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHtml;
    
    // Replace existing or append new smoothly
    const currentNodes = Array.from(c.children);
    const newNodes = Array.from(tempDiv.children);
    
    // We just replace the innerHTML for simplicity but we prevent scrolling jumps
    const scrollPos = window.scrollY;
    c.innerHTML = newHtml;
    window.scrollTo(0, scrollPos);
  } else {
    c.innerHTML = newHtml;
  }
  
  if (state.filtered.length > state.visibleCount) {
    html += `
      <div style="text-align:center; margin:24px 0 48px;">
        <button onclick="showMoreFlights()" style="background:var(--blue); color:#fff; border:none; padding:12px 32px; border-radius:30px; font-weight:600; font-family:'Inter',sans-serif; cursor:pointer; font-size:15px; box-shadow:0 4px 12px rgba(26,115,232,0.3); transition:background 0.2s;" onmouseover="this.style.background='var(--blue-dk)'" onmouseout="this.style.background='var(--blue)'">
          ${state.lang === 'fr' ? 'Afficher plus de résultats' : (state.lang === 'ar' ? 'عرض المزيد من النتائج' : 'Show more results')}
        </button>
      </div>
    `;
  }
  
  c.innerHTML = html;
}

function showMoreFlights() {
  state.visibleCount += 15;
  renderFlights();
}

function buildCard(f, idx) {
  const t = i18n[state.lang];
  const isRT = !!f.isRoundTrip;
  const outbound = isRT ? f.outbound : f;
  const returnLeg = isRT ? f.returnLeg : null;

  const alCode = outbound.airline || f.airline || 'XX';
  const al = airlines[alCode] || { name: alCode, logo: 'https://www.gstatic.com/flights/airline_logos/70px/dark/' + alCode + '.png' };

  const best = minPrice(f);
  const safeId = `fc-${(f.id || '').replace(/[^a-z0-9]/gi, '-')}`;
  const isExpanded = state.expandedFlightId === safeId;

  const dStr = toDateString(calendarState.departDate);
  const rStr = state.tripType === 'roundtrip' ? toDateString(calendarState.returnDate) : '';
  const totalPax = (parseInt($('pax-adults')?.value) || 1) + (parseInt($('pax-children')?.value) || 0);

  const oApt = getApt(outbound.origin);
  const dApt = getApt(outbound.destination);
  const depCity = oApt?.city?.[state.lang] || outbound.origin;
  const arrCity = dApt?.city?.[state.lang] || outbound.destination;
  const outStops = outbound.stops !== undefined ? outbound.stops : (f.stops || 0);
  const outShift = outbound.arrivalDayShift || 0;

  const chevron = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

  // ── Compact row ──────────────────────────────────────────────────
  const compactRow = `
<div class="flight-row${isExpanded ? ' expanded' : ''}" onclick="toggleFlight('${safeId}')">
  <div class="fr-airline">
    <div class="fr-logo-wrap">
      <img src="${al.logo}" alt="${al.name}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="fr-logo-fb" style="display:none">${alCode}</div>
    </div>
    <div class="fr-airline-name">${al.name}</div>
  </div>

  <div class="fr-dep">
    <div class="fr-time">${outbound.departure}</div>
    <div class="fr-city">${depCity}</div>
  </div>

  <div class="fr-meta">
    <div class="fr-dur">${outbound.duration}</div>
    <div class="fr-track">
      <div class="fr-dot"></div>
      <div class="fr-line"></div>
      <span class="fr-plane-icon">${IC.plane}</span>
      <div class="fr-line"></div>
      <div class="fr-dot"></div>
    </div>
    <span class="${outStops === 0 ? 'fr-direct' : 'fr-stop'}">
      ${outStops === 0 ? t.stops_direct : (outStops === 1 ? t.stops_1 : t.stops_2)}
    </span>
  </div>

  <div class="fr-arr">
    <div class="fr-time">${outbound.arrival}${outShift ? `<sup class="fr-dayshift">+${outShift}</sup>` : ''}</div>
    <div class="fr-city">${arrCity}</div>
  </div>

  ${isRT ? `<div class="fr-rt-badge">${t.label_return || 'A/R'}</div>` : ''}

  <div class="fr-price-col">
    <div class="fr-price">${best.toLocaleString()} <span class="fr-cur">DZD</span></div>
    <div class="fr-price-label">${t.from_price || 'à partir de'}</div>
  </div>

  <div class="fr-chevron">${chevron}</div>
</div>`;

  // ── Detail: leg summaries (round-trip only) ───────────────────────
  const buildLegRow = (leg, tagClass, tagLabel) => {
    const o = getApt(leg.origin);
    const d = getApt(leg.destination);
    const s = leg.stops !== undefined ? leg.stops : 0;
    return `
<div class="detail-leg">
  <span class="dl-tag ${tagClass}">${tagLabel}</span>
  <span class="dl-times">${leg.departure} – ${leg.arrival}${leg.arrivalDayShift ? `<sup>+${leg.arrivalDayShift}</sup>` : ''}</span>
  <span class="dl-route">${o?.city?.[state.lang] || leg.origin} (${leg.origin}) → ${d?.city?.[state.lang] || leg.destination} (${leg.destination})</span>
  <span class="dl-dur">${leg.duration}</span>
  <span class="${s === 0 ? 'dl-direct' : 'dl-stop'}">${s === 0 ? t.stops_direct : (s === 1 ? t.stops_1 : t.stops_2)}</span>
</div>`;
  };

  const legsHTML = isRT ? `
<div class="detail-legs">
  ${buildLegRow(outbound, 'out', t.label_depart)}
  ${returnLeg ? buildLegRow(returnLeg, 'ret', t.label_return) : ''}
</div>` : '';

  // ── Detail: provider price rows ───────────────────────────────────
  const providers = [
    { key: 'volz',        name: 'Volz.app',       url: 'https://volz.app/en' },
    { key: 'mondial',     name: 'MondialBooking',  url: 'https://www.mondialbooking.com/fr/flights' },
    { key: 'h24voyages',  name: 'H24 Voyages',     url: 'https://vols.h24voyages.com' },
    { key: 'dunevoyages', name: 'Dune Voyages',    url: 'https://www.dunevoyages.com' },
  ]
  .filter(p => f.prices?.[p.key] != null)
  .sort((a, b) => f.prices[a.key] - f.prices[b.key]);

  const providerRowsHTML = providers.map((p, i) => `
<div class="provider-row${i === 0 ? ' best' : ''}">
  <div class="pr-name">${p.name}</div>
  <div class="pr-price">${f.prices[p.key].toLocaleString()}<span class="pr-cur"> DZD</span></div>
  ${i === 0 ? `<div class="pr-best-badge">${IC.ok} ${t.best_deal || 'Meilleur prix'}</div>` : '<div class="pr-badge-placeholder"></div>'}
  <div class="pr-spacer"></div>
  <a href="${p.url}" target="_blank" rel="noopener" class="pr-book"
     onclick="handleBookRedirect(event,'${p.key}','${outbound.origin}','${outbound.destination}','${dStr}','${rStr}',${totalPax},'${p.url}')">
    ${p.name} ${IC.link}
  </a>
</div>`).join('');

  // Disable entrance animation during dynamic updates to prevent blinking
  const animStyle = activeEventSource ? '' : `style="animation-delay:${idx * 0.04}s"`;

  return `
<article class="flight-card" id="${safeId}" ${animStyle} aria-label="${al.name}">
  ${compactRow}
  <div class="flight-detail${isExpanded ? ' open' : ''}" id="detail-${safeId}">
    ${legsHTML}
    <div class="providers-list">${providerRowsHTML}</div>
  </div>
</article>`;
}

// ── Toggle flight detail panel ────────────────────────────────────
function toggleFlight(id) {
  const prev = state.expandedFlightId;

  // Collapse previously open card
  if (prev && prev !== id) {
    const prevDetail = document.getElementById(`detail-${prev}`);
    const prevRow    = document.querySelector(`#${prev} .flight-row`);
    if (prevDetail) prevDetail.classList.remove('open');
    if (prevRow)    prevRow.classList.remove('expanded');
  }

  const detail = document.getElementById(`detail-${id}`);
  const row    = document.querySelector(`#${id} .flight-row`);

  if (prev === id) {
    // Same card clicked — collapse
    if (detail) detail.classList.remove('open');
    if (row)    row.classList.remove('expanded');
    state.expandedFlightId = null;
  } else {
    // Open new card
    if (detail) detail.classList.add('open');
    if (row)    row.classList.add('expanded');
    state.expandedFlightId = id;
  }
}

// ===== Skeleton =====
function showSkeletons(n) {
  const c = $('flights-container');
  if (!c) return;
  c.innerHTML = Array(n).fill(0).map(() => `
    <div class="skel" style="padding:0;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 20px">
        <div class="sl" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;margin:0"></div>
        <div class="sl" style="width:90px;height:20px;margin:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px">
          <div class="sl" style="width:60px;height:10px;margin:0"></div>
          <div class="sl" style="width:100%;max-width:110px;height:2px;margin:0"></div>
          <div class="sl" style="width:50px;height:10px;margin:0"></div>
        </div>
        <div class="sl" style="width:90px;height:20px;margin:0"></div>
        <div class="sl" style="width:90px;height:22px;margin:0;margin-left:auto"></div>
      </div>
    </div>`).join('');
}

// ===== Toast =====
function showToast(msg) {
  const w=$('toast-wrap'); if(!w) return;
  const el=document.createElement('div');
  el.className='toast';el.innerHTML=`${IC.ok} ${msg}`;
  w.appendChild(el);setTimeout(()=>el.remove(),2800);
}

// ===== Popular =====
function renderPopular() {
  const c=$('popular-grid'); if(!c) return;
  const t=i18n[state.lang];
  c.innerHTML=popularRoutes.map(r=>`
    <div class="route-card" onclick="quickSearch('${r.o}','${r.d}')" tabindex="0" role="button">
      <div class="rc-codes">${r.o} → ${r.d}</div>
      <div class="rc-cities">${r.oc[state.lang]} – ${r.dc[state.lang]}</div>
      <div class="rc-price">${r.p.toLocaleString()} DZD</div>
      <div class="rc-from">${t.from_price}</div>
    </div>`).join('');
}

function quickSearch(o,d) {
  setInputValue('input-from', o);
  setInputValue('input-to', d);
  doSearch();
  setTimeout(()=>document.querySelector('.main')?.scrollIntoView({behavior:'smooth',block:'start'}),200);
}

// ===== Custom Autocomplete Dropdown Logic =====
function loadGlobalAirports() {
  if (globalAirports.length > 0) return;

  if (window.globalAirportsData) {
    const data = window.globalAirportsData;
    const mapped = data.map(item => {
      const local = airports.find(a => a.iata === item.iata);
      if (local) {
        local.type = item.type || 'AP';
        local.city_code = item.city_code || item.iata;
        local.state = item.state || '';
        return local;
      }
      return {
        iata: item.iata,
        city: { en: item.city, fr: item.city, ar: item.city },
        name: { en: item.name, fr: item.name, ar: item.name },
        country: item.country,
        type: item.type || 'AP',
        city_code: item.city_code || item.iata,
        state: item.state || ''
      };
    });

    const combined = [...airports];
    // Make sure local ones have their types initialized
    combined.forEach(a => {
      if (!a.type) {
        const match = data.find(item => item.iata === a.iata);
        a.type = match ? match.type : 'AP';
        a.city_code = match ? match.city_code : a.iata;
        a.state = match ? match.state : '';
      }
    });

    mapped.forEach(item => {
      if (!combined.some(a => a.iata === item.iata)) {
        combined.push(item);
      }
    });

    globalAirports = combined;
    console.log('Global database loaded successfully: ' + globalAirports.length + ' active airports/cities.');

    // Translate the default values in inputs to their full translation-rich names
    const currentFrom = ($('input-from')?.value || '').match(/\(([A-Z]{3})\)/)?.[1] || 'ALG';
    const currentTo = ($('input-to')?.value || '').match(/\(([A-Z]{3})\)/)?.[1] || 'CDG';
    setInputValue('input-from', currentFrom);
    setInputValue('input-to', currentTo);
  } else {
    // If the database script hasn't loaded yet, try again shortly
    setTimeout(loadGlobalAirports, 50);
  }
}

function setupAutocomplete(inputId, dropdownId) {
  const input = $(inputId);
  const dropdown = $(dropdownId);
  if (!input || !dropdown) return;

  let highlightedIndex = -1;
  let currentSuggestions = [];

  function renderSuggestions(query) {
    query = (query || '').toLowerCase().trim();
    let matches = [];
    const sourceDb = globalAirports.length > 0 ? globalAirports : airports;

    if (!query) {
      // Show default popular airports
      matches = sourceDb.filter(a => ['ALG', 'ORN', 'CZL', 'CDG', 'IST', 'DXB'].includes(a.iata));
    } else {
      matches = sourceDb.filter(a => {
        const cEn = a.city?.en || '', cFr = a.city?.fr || '', cAr = a.city?.ar || '';
        const nEn = a.name?.en || '', nFr = a.name?.fr || '', nAr = a.name?.ar || '';
        const country = a.country || '';
        const stateVal = a.state || '';

        const cityMatch = (cEn + ' ' + cFr + ' ' + cAr).toLowerCase().includes(query);
        const nameMatch = (nEn + ' ' + nFr + ' ' + nAr).toLowerCase().includes(query);
        const countryMatch = country.toLowerCase().includes(query);
        const iataMatch = a.iata.toLowerCase().includes(query);
        const stateMatch = stateVal.toLowerCase().includes(query);

        return cityMatch || nameMatch || countryMatch || iataMatch || stateMatch;
      });
    }

    // Sort matches:
    // 1. Exact IATA code match first
    // 2. Metropolitan areas (CC) come before individual airports (AP)
    // 3. Alphabetical by city name
    matches.sort((a, b) => {
      const aIata = a.iata.toLowerCase();
      const bIata = b.iata.toLowerCase();

      if (aIata === query && bIata !== query) return -1;
      if (bIata === query && aIata !== query) return 1;

      if (aIata.startsWith(query) && !bIata.startsWith(query)) return -1;
      if (bIata.startsWith(query) && !aIata.startsWith(query)) return 1;

      const aIsCC = a.type === 'CC';
      const bIsCC = b.type === 'CC';
      if (aIsCC && !bIsCC) return -1;
      if (bIsCC && !aIsCC) return 1;

      const aCity = (a.city[state.lang] || a.city.en || '').toLowerCase();
      const bCity = (b.city[state.lang] || b.city.en || '').toLowerCase();
      return aCity.localeCompare(bCity);
    });

    currentSuggestions = matches;
    highlightedIndex = -1;

    if (matches.length === 0) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('open');
      return;
    }

    const planeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5c-1.5-1.5-3.5-1.5-5 0L11 6 2.8 4.2c-.5-.1-.9.1-1.1.5L.6 6.1c-.2.4 0 .9.4 1.1L7 9l-2 3H3l-1 1 3 2 2 3 1-1v-2l3-2 1.9 6.2c.2.4.7.6 1.1.4l1.4-.6c.5-.2.7-.6.6-1.1z"/></svg>`;
    const cityIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><line x1="9" y1="16" x2="15" y2="16"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/></svg>`;

    dropdown.innerHTML = matches.slice(0, 40).map((a, idx) => {
      const isCC = a.type === 'CC';
      const itemClass = isCC ? 'ac-item ac-city-group' : 'ac-item';
      const icon = isCC ? cityIcon : planeIcon;
      const subtext = isCC 
        ? `${i18n[state.lang].all_airports || 'All airports'} ${a.country ? '· ' + a.country : ''}`
        : `${a.name[state.lang] || a.name.en}${a.state ? ' · ' + a.state : ''}${a.country ? ' · ' + a.country : ''}`;

      return `
        <div class="${itemClass}" data-iata="${a.iata}" data-idx="${idx}">
          <span class="ac-icon">${icon}</span>
          <div class="ac-details">
            <div class="ac-main">
              <span class="ac-city">${a.city[state.lang] || a.city.en}</span>
              <span class="ac-code ${isCC ? 'city-code' : ''}">${a.iata}</span>
            </div>
            <span class="ac-apt">${subtext}</span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.add('open');

    // Add click/touch events to items — mobile-safe
    dropdown.querySelectorAll('.ac-item').forEach(item => {
      let selected = false; // guard against double-fire
      const handleSelect = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selected) return;
        selected = true;
        selectItem(matches[parseInt(item.dataset.idx)]);
      };
      item.addEventListener('touchend', handleSelect, { passive: false });
      item.addEventListener('mousedown', handleSelect);
    });
  }

  function selectItem(apt) {
    const cityLabel = apt.city[state.lang] || apt.city.en;
    input.value = `${cityLabel} (${apt.iata})`;
    dropdown.classList.remove('open');
    input.blur();
  }

  input.addEventListener('focus', () => {
    // Lazy load global airports on focus if not already done
    loadGlobalAirports();
    // Select all text on focus for easier typing
    setTimeout(() => input.select(), 50);
    renderSuggestions(input.value.includes('(') ? '' : input.value);
  });

  input.addEventListener('input', () => {
    renderSuggestions(input.value);
  });

  input.addEventListener('blur', () => {
    // Delayed hide — 350ms gives mobile touchend time to fire before dropdown closes
    setTimeout(() => {
      dropdown.classList.remove('open');
      
      // If user typed some custom 3-letter IATA code, format it nicely
      const val = input.value.trim().toUpperCase();
      const db = globalAirports.length > 0 ? globalAirports : airports;
      if (val.length === 3 && db.some(a => a.iata === val)) {
        setInputValue(inputId, val);
      }
    }, 350);
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown.classList.contains('open')) return;

    const items = dropdown.querySelectorAll('.ac-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % Math.min(currentSuggestions.length, 40);
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + Math.min(currentSuggestions.length, 40)) % Math.min(currentSuggestions.length, 40);
      updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < Math.min(currentSuggestions.length, 40)) {
        selectItem(currentSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('open');
    }
  });


  function updateHighlight(items) {
        items.forEach((item, idx) => {
      item.classList.toggle('highlighted', idx === highlightedIndex);
      if (idx === highlightedIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }
}

// ===== Google Flights Style Custom range calendar picker =====
let calendarState = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(), // 0-indexed
  departDate: new Date(), // Date object
  returnDate: null, // Date object or null
  selectingField: 'depart', // 'depart' or 'return'
  hoverDate: null // Date object or null
};

// Format Date object to display text
function formatDateDisplay(date, lang) {
  if (!date) return '';
  const months = i18n[lang].months;
  const weekdays = i18n[lang].weekdays;
  const day = date.getDate();
  const monthStr = months[date.getMonth()].slice(0, 4);
  const wkdyStr = date.toLocaleDateString(lang, { weekday: 'short' });
  return `${wkdyStr}. ${day} ${monthStr}`;
}

// Convert Date object to YYYY-MM-DD string
function toDateString(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateString(str) {
  if (!str) return null;
  const parts = str.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function renderCalendar() {
  const container = $('cal-dropdown');
  if (!container) return;

  const t = i18n[state.lang];
  const months = t.months;
  const weekdays = t.weekdays;

  const m1Year = calendarState.currentYear;
  const m1Month = calendarState.currentMonth;

  let m2Year = m1Year;
  let m2Month = m1Month + 1;
  if (m2Month > 11) {
    m2Month = 0;
    m2Year += 1;
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  const isPastMonth = m1Year < today.getFullYear() || (m1Year === today.getFullYear() && m1Month <= today.getMonth());

  const prevBtnClass = isPastMonth ? 'cal-nav-btn disabled' : 'cal-nav-btn';

  const chevronLeft = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  const chevronRight = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

  container.innerHTML = `
    <div class="cal-months-wrap">
      <!-- Month 1 Panel -->
      <div class="cal-month-panel">
        <div class="cal-hdr">
          <button type="button" class="${prevBtnClass}" id="cal-prev-btn" aria-label="Mois précédent">${chevronLeft}</button>
          <span class="cal-month-title">${months[m1Month]} ${m1Year}</span>
          <span style="width:32px"></span>
        </div>
        <div class="cal-weekdays">
          ${weekdays.map(w => `<span class="cal-wkdy">${w}</span>`).join('')}
        </div>
        <div class="cal-days-grid">
          ${generateDaysHTML(m1Year, m1Month)}
        </div>
      </div>

      <!-- Month 2 Panel -->
      <div class="cal-month-panel">
        <div class="cal-hdr">
          <span style="width:32px"></span>
          <span class="cal-month-title">${months[m2Month]} ${m2Year}</span>
          <button type="button" class="cal-nav-btn" id="cal-next-btn" aria-label="Mois suivant">${chevronRight}</button>
        </div>
        <div class="cal-weekdays">
          ${weekdays.map(w => `<span class="cal-wkdy">${w}</span>`).join('')}
        </div>
        <div class="cal-days-grid">
          ${generateDaysHTML(m2Year, m2Month)}
        </div>
      </div>
    </div>
  `;

  $('cal-prev-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPastMonth) return;
    calendarState.currentMonth--;
    if (calendarState.currentMonth < 0) {
      calendarState.currentMonth = 11;
      calendarState.currentYear--;
    }
    renderCalendar();
  });

  $('cal-next-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    calendarState.currentMonth++;
    if (calendarState.currentMonth > 11) {
      calendarState.currentMonth = 0;
      calendarState.currentYear++;
    }
    renderCalendar();
  });

  container.querySelectorAll('.cal-day:not(.disabled)').forEach(dayEl => {
    const dateStr = dayEl.dataset.date;
    const dateObj = parseDateString(dateStr);

    dayEl.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCalendarDate(dateObj);
    });

    dayEl.addEventListener('mouseenter', () => {
      if (calendarState.selectingField === 'return' || (calendarState.selectingField === 'depart' && calendarState.departDate && !calendarState.returnDate)) {
        calendarState.hoverDate = dateObj;
        updateCalendarHoverHighlights();
      }
    });
  });

  container.addEventListener('mouseleave', () => {
    calendarState.hoverDate = null;
    updateCalendarHoverHighlights();
  });
}

function generateDaysHTML(year, month) {
  const today = new Date();
  today.setHours(0,0,0,0);

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDayDate = new Date(year, month + 1, 0).getDate();

  let daysHTML = '';

  for (let i = 0; i < firstDayIndex; i++) {
    daysHTML += `<span class="cal-day disabled"></span>`;
  }

  for (let d = 1; d <= lastDayDate; d++) {
    const current = new Date(year, month, d);
    current.setHours(0,0,0,0);
    const dateStr = toDateString(current);
    
    const isDisabled = current < today;
    
    const isDepart = calendarState.departDate && current.getTime() === calendarState.departDate.getTime();
    const isReturn = state.tripType === 'roundtrip' && calendarState.returnDate && current.getTime() === calendarState.returnDate.getTime();
    const isBound = isDepart || isReturn;

    let inRange = false;
    let isRangeStart = false;
    let isRangeEnd = false;

    if (state.tripType === 'roundtrip' && calendarState.departDate && calendarState.returnDate) {
      const cTime = current.getTime();
      const dTime = calendarState.departDate.getTime();
      const rTime = calendarState.returnDate.getTime();
      if (cTime > dTime && cTime < rTime) {
        inRange = true;
      }
      if (cTime === dTime) isRangeStart = true;
      if (cTime === rTime) isRangeEnd = true;
    }

    const dayClass = [
      'cal-day',
      isDisabled ? 'disabled' : '',
      isBound ? 'sel-bound' : '',
      inRange ? 'range-highlight' : '',
      isRangeStart ? 'range-start' : '',
      isRangeEnd ? 'range-end' : ''
    ].filter(Boolean).join(' ');

    daysHTML += `
      <div class="${dayClass}" data-date="${dateStr}">
        <span class="cal-day-cell">${d}</span>
      </div>
    `;
  }

  return daysHTML;
}

function selectCalendarDate(date) {
  if (calendarState.selectingField === 'depart') {
    calendarState.departDate = date;
    
    if (calendarState.returnDate && calendarState.returnDate < date) {
      calendarState.returnDate = null;
    }
    
    if (state.tripType === 'roundtrip') {
      calendarState.selectingField = 'return';
    } else {
      calendarState.returnDate = null;
      $('cal-dropdown').classList.remove('open');
    }
  } else {
    if (date < calendarState.departDate) {
      calendarState.departDate = date;
      calendarState.returnDate = null;
      calendarState.selectingField = 'return';
    } else {
      calendarState.returnDate = date;
      $('cal-dropdown').classList.remove('open');
    }
  }

  updateDateInputs();
  renderCalendar();
}

function updateCalendarHoverHighlights() {
  const container = $('cal-dropdown');
  if (!container || !calendarState.departDate) return;

  const departTime = calendarState.departDate.getTime();

  container.querySelectorAll('.cal-day:not(.disabled)').forEach(dayEl => {
    const dateStr = dayEl.dataset.date;
    const dateObj = parseDateString(dateStr);
    const dayTime = dateObj.getTime();

    dayEl.classList.remove('range-highlight', 'range-start', 'range-end');

    if (state.tripType === 'roundtrip') {
      const hoverTime = calendarState.hoverDate ? calendarState.hoverDate.getTime() : null;
      const returnTime = calendarState.returnDate ? calendarState.returnDate.getTime() : null;
      const targetTime = hoverTime || returnTime;

      if (targetTime && dayTime >= departTime && dayTime <= targetTime) {
        dayEl.classList.add('range-highlight');
        if (dayTime === departTime) dayEl.classList.add('range-start');
        if (dayTime === targetTime) dayEl.classList.add('range-end');
      } else if (calendarState.departDate && calendarState.returnDate) {
        const rTime = calendarState.returnDate.getTime();
        if (dayTime >= departTime && dayTime <= rTime) {
          dayEl.classList.add('range-highlight');
          if (dayTime === departTime) dayEl.classList.add('range-start');
          if (dayTime === rTime) dayEl.classList.add('range-end');
        }
      }
    }
  });
}

function updateDateInputs() {
  const depInput = $('input-depart');
  const retInput = $('input-return');
  const lang = state.lang;

  if (depInput && calendarState.departDate) {
    depInput.value = formatDateDisplay(calendarState.departDate, lang);
  }
  if (retInput) {
    if (state.tripType === 'oneway') {
      retInput.value = '—';
    } else if (calendarState.returnDate) {
      retInput.value = formatDateDisplay(calendarState.returnDate, lang);
    } else {
      retInput.value = i18n[lang].all_airports ? 'Sélectionner' : 'Select';
    }
  }
}

function setupCalendar() {
  const calDropdown = $('cal-dropdown');
  const depTrigger = $('depart-trigger');
  const retTrigger = $('return-trigger');
  
  if (!calDropdown || !depTrigger || !retTrigger) return;

  depTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.ac-dropdown').forEach(d => d.classList.remove('open'));
    $('pax-popup')?.classList.remove('open');
    
    calendarState.selectingField = 'depart';
    calDropdown.classList.add('open');
    renderCalendar();
  });

  retTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll('.ac-dropdown').forEach(d => d.classList.remove('open'));
    $('pax-popup')?.classList.remove('open');

    if (state.tripType === 'oneway') {
      setTripType('roundtrip');
    }
    calendarState.selectingField = 'return';
    calDropdown.classList.add('open');
    renderCalendar();
  });

  document.addEventListener('click', (e) => {
    if (calDropdown.classList.contains('open') && !calDropdown.contains(e.target) && !depTrigger.contains(e.target) && !retTrigger.contains(e.target)) {
      calDropdown.classList.remove('open');
    }
  });

  const today = new Date();
  today.setHours(0,0,0,0);
  calendarState.departDate = today;

  const returnD = new Date();
  returnD.setHours(0,0,0,0);
  returnD.setDate(returnD.getDate() + 7);
  calendarState.returnDate = returnD;

  updateDateInputs();
}

// ===== Airline Filter Dropdown Functions =====
function toggleAirlineFilter(e) {
  if (e) e.stopPropagation();
  const dropdown = $('airline-filter-dropdown');
  if (!dropdown) return;
  
  const isOpen = dropdown.classList.contains('open');
  // Close other dropdowns
  document.querySelectorAll('.ac-dropdown, .cal-dropdown').forEach(d => d.classList.remove('open'));
  $('pax-popup')?.classList.remove('open');
  
  if (isOpen) {
    dropdown.classList.remove('open');
  } else {
    populateAirlinesFilter();
    dropdown.classList.add('open');
  }
}

function populateAirlinesFilter() {
  const dropdown = $('airline-filter-dropdown');
  if (!dropdown) return;
  
  const codes = Object.keys(airlines);
  dropdown.innerHTML = codes.map(code => {
    const al = airlines[code];
    const isChecked = state.filterAirlines.includes(code);
    return `
      <div class="airline-option" onclick="event.stopPropagation();">
        <input type="checkbox" id="check-al-${code}" value="${code}" ${isChecked ? 'checked' : ''} onchange="toggleAirlineCode('${code}')" />
        <label for="check-al-${code}">
          <span>${al.name}</span>
          <img class="airline-logo-sm" src="${al.logo}" alt="${al.name}" onerror="this.style.display='none'">
        </label>
      </div>
    `;
  }).join('');
}

function toggleAirlineCode(code) {
  const index = state.filterAirlines.indexOf(code);
  if (index > -1) {
    state.filterAirlines.splice(index, 1);
  } else {
    state.filterAirlines.push(code);
  }
  
  // Highlight the filter chip if any airline is active!
  const btn = $('filter-airline-btn');
  if (btn) {
    btn.classList.toggle('active', state.filterAirlines.length > 0);
  }
  
  applySort();
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', ()=>{
  // Lazy load global airports on startup (after window loads to prioritize FCP)
  window.addEventListener('load', () => {
    // Delay slightly to allow main thread to be fully idle
    setTimeout(loadGlobalAirports, 300);
    // Fetch dynamic prices for popular routes
    setTimeout(fetchPopularPrices, 400);
  });

  // Scroll
  window.addEventListener('scroll',()=>{
    $('scroll-top')?.classList.toggle('show',scrollY>400);
  },{passive:true});

  // Dates - Setup custom Google Flights style picker
  setupCalendar();

  // Unified search trigger — prevents double-firing on mobile
  let searchPending = false;
  function triggerSearch(e) {
    if (e) e.preventDefault();
    if (searchPending) return; // guard against double-fire from form+button
    searchPending = true;
    doSearch();
    setTimeout(() => { searchPending = false; }, 1000);
    setTimeout(() => document.querySelector('.main')?.scrollIntoView({behavior:'smooth',block:'start'}), 200);
  }

  $('search-form')?.addEventListener('submit', triggerSearch);
  $('search-btn')?.addEventListener('click', triggerSearch);
  $('search-btn')?.addEventListener('touchend', triggerSearch, { passive: false });

  // Setup custom autocomplete
  setupAutocomplete('input-from', 'ac-from');
  setupAutocomplete('input-to', 'ac-to');

  // Init Language (will also format default inputs)
  setLang('fr');
  setTripType(state.tripType);
  updatePax();

  // Wait for user interaction to trigger search
});

async function fetchPopularPrices() {
  try {
    const res = await fetch('/api/popular-prices');
    if (!res.ok) return;
    const data = await res.json();
    if (Object.keys(data).length === 0) return;

    let updated = false;
    popularRoutes.forEach(route => {
      const key = `${route.o}-${route.d}`;
      if (data[key] && data[key].price) {
        route.p = data[key].price;
        updated = true;
      }
    });

    if (updated) {
      renderPopular();
    }
  } catch (err) {
    console.warn('[Aggregator Client] Failed to fetch dynamic popular prices:', err.message);
  }
}

// ===== Deep Link Booking redirect handler =====

/** Build a Volz deep-link URL client-side (used when backend is offline) */
function buildVolzUrl(from, to, departDate, returnDate, pax) {
  const tripType = returnDate ? 'RT' : 'OW';
  const params = new URLSearchParams({
    trip_type: tripType, max_connections: '2', luggage_included: '0',
    origin_0: from, destination_0: to, date_0: departDate,
    adults: String(pax || 1), children: '0', infants: '0', cabin: 'Economy',
  });
  if (returnDate) params.set('return_date', returnDate);
  return `https://volz.app/en/flights?${params.toString()}`;
}

/** Build a MondialBooking deep-link URL client-side */
function buildMondialUrl(from, to, departDate, returnDate, pax) {
  const toMondialDate = d => { if (!d) return ''; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; };
  const tripType = returnDate ? 'Round Trip' : 'One Way';
  const params = new URLSearchParams({
    depart1: from, destination1: to,
    departureDate: toMondialDate(departDate),
    arrivalDate: toMondialDate(returnDate || departDate),
    tripType, adults: String(pax || 1), children: '0',
  });
  return `https://www.mondialbooking.com/fr/flights?${params.toString()}`;
}

/**
 * Build an H24 Voyages deep-link URL client-side.
 * Mirrors the logic in providers/h24voyages.js buildSearchUrl().
 * Works for both one-way and round-trip flights.
 */
function buildH24Url(from, to, departDate, returnDate, pax) {
  const isRT = !!returnDate;
  const searchState = {
    tripType: isRT ? 'Round Trip' : 'One Way',
    passengerDrop: {
      adults: parseInt(pax) || 1,
      young: 0,
      seniors: 0,
      child: 0,
      infants: 0,
    },
    classe: 'economy',
    depart1: from,
    depart1iata: {
      airport_name: from,
      country: '',
      city_name: from,
      iata_code: from,
      country_code: 'DZ',
    },
    destination1: to,
    destination1iata: {
      airport_name: to,
      country: '',
      city_name: to,
      iata_code: to,
      country_code: 'DZ',
    },
    stops: false,
    baggage: false,
    refundable: false,
  };

  if (isRT && returnDate) {
    searchState.datePickerRange1 = [
      `${departDate}T12:00:00.000Z`,
      `${returnDate}T12:00:00.000Z`,
    ];
  } else {
    searchState.datePicker1 = `${departDate}T12:00:00.000Z`;
  }

  const encoded = encodeURIComponent(JSON.stringify(searchState));
  return `https://vols.h24voyages.com/flights/results?${encoded}=`;
}

/**
 * Build a Dune Voyages deep-link URL client-side.
 * Mirrors providers/dunevoyages.js buildSearchUrl().
 * Works for both one-way and round-trip.
 */
function buildDuneUrl(from, to, departDate, returnDate, pax) {
  const isRT = !!returnDate;
  const searchState = {
    tripType: isRT ? 'Round Trip' : 'One Way',
    passengerDrop: { adults: parseInt(pax) || 1, child: 0, infants: 0 },
    classe: 'economy',
    depart1: from,
    depart1iata: { iata_code: from, airport_name: from, city: from, country: 'Algeria', country_code: 'DZ' },
    destination1: to,
    destination1iata: { iata_code: to, airport_name: to, city: to, country: '', country_code: '' },
    stops: false,
    baggage: false,
    refundable: false,
  };
  if (isRT && returnDate) {
    searchState.datePickerRange1 = [
      `${departDate}T00:00:00.000Z`,
      `${returnDate}T00:00:00.000Z`,
    ];
  } else {
    searchState.datePicker1 = `${departDate}T00:00:00.000Z`;
  }
  const encoded = encodeURIComponent(JSON.stringify(searchState));
  return `https://vols.dunevoyages.com/flights/results?${encoded}=`;
}

async function handleBookRedirect(event, provider, from, to, departDate, returnDate, pax, fallbackUrl) {
  event.preventDefault();
  const t = i18n[state.lang];
  showToast(t.toast_redirect);

  try {
    const url = `/api/flights/book?provider=${provider}&from=${from}&to=${to}&departDate=${departDate}&returnDate=${returnDate}&pax=${pax}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('API book redirect failed');
    const data = await response.json();
    if (data.redirectUrl) {
      window.open(data.redirectUrl, '_blank');
      return;
    }
  } catch (err) {
    console.warn('[Aggregator Client] Backend offline — building deep-link client-side:', err.message);
  }

  // Client-side deep-link fallback — much better than just the homepage!
  let deepLink;
  if (provider === 'volz') {
    deepLink = buildVolzUrl(from, to, departDate, returnDate, pax);
  } else if (provider === 'mondial') {
    deepLink = buildMondialUrl(from, to, departDate, returnDate, pax);
  } else if (provider === 'h24voyages') {
    deepLink = buildH24Url(from, to, departDate, returnDate, pax);
  } else if (provider === 'dunevoyages') {
    deepLink = buildDuneUrl(from, to, departDate, returnDate, pax);
  } else {
    deepLink = fallbackUrl;
  }
  window.open(deepLink, '_blank');
}
