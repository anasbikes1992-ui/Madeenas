export const STOREFRONT_LANGUAGES = ['en', 'si', 'ta'] as const

export type StorefrontLanguage = (typeof STOREFRONT_LANGUAGES)[number]

export const STOREFRONT_LANGUAGE_LABELS: Record<StorefrontLanguage, string> = {
  en: 'English',
  si: 'Sinhala',
  ta: 'Tamil',
}

type StorefrontDictionary = {
  brandTag: string
  customerSignup: string
  staffLogin: string
  exploreCatalog: string
  requestOrder: string
  catalogLabel: string
  categoriesLabel: string
  categoriesBody: string
  followUpLabel: string
  followUpBody: string
  heroTitle: string
  heroBody: string
  heroHint: string
  heroPrimary: string
  heroSecondary: string
  searchPlaceholder: string
  allProducts: string
  productsLabel: string
  matchingLabel: string
  noProductsTitle: string
  noProductsBody: string
  orderModalTitle: string
  orderFormTitle: string
  yourName: string
  email: string
  phone: string
  quantity: string
  colorPreference: string
  specialRequirements: string
  submitOrder: string
  submitting: string
  orderSuccessTitle: string
  orderSuccessBody: string
  browseMore: string
  howItWorksTitle: string
  flowLabel: string
  stepOneTitle: string
  stepOneBody: string
  stepTwoTitle: string
  stepTwoBody: string
  stepThreeTitle: string
  stepThreeBody: string
  supportTitle: string
  operationsLabel: string
  supportBody: string
  adminLabel: string
  shopLabel: string
  customerLabel: string
  supportAdmin: string
  supportShop: string
  supportCustomer: string
  toastOrderPlaced: string
  toastOrderFailed: string
  toastLoadFailed: string
  validationName: string
  validationEmail: string
  validationQuantity: string
}

export const storefrontDictionary: Record<StorefrontLanguage, StorefrontDictionary> = {
  en: {
    brandTag: 'Textile sourcing made simple',
    customerSignup: 'Customer Signup',
    staffLogin: 'Staff Login',
    exploreCatalog: 'Explore catalog',
    requestOrder: 'Request an order',
    catalogLabel: 'Catalog',
    categoriesLabel: 'Categories',
    categoriesBody: 'Filter by material family or usage.',
    followUpLabel: 'Follow-up',
    followUpBody: 'Admin, shop, and customer notification flow ready.',
    heroTitle: 'Premium textile raw materials for shops, projects, and repeat buyers.',
    heroBody: 'Browse our live collection, submit your quantity needs, and let our team confirm availability, matching colors, and delivery options.',
    heroHint: 'Customer orders go directly to the admin and shop follow-up flow.',
    heroPrimary: 'Start ordering',
    heroSecondary: 'Browse collection',
    searchPlaceholder: 'Search fabrics, designs, colors, or SKU...',
    allProducts: 'All products',
    productsLabel: 'products ready to order',
    matchingLabel: 'matching',
    noProductsTitle: 'No products found',
    noProductsBody: 'Try another search term or switch the product group.',
    orderModalTitle: 'Product details',
    orderFormTitle: 'Order request',
    yourName: 'Your name',
    email: 'Email',
    phone: 'Phone or WhatsApp',
    quantity: 'Quantity',
    colorPreference: 'Color preference',
    specialRequirements: 'Special requirements',
    submitOrder: 'Send order request',
    submitting: 'Submitting...',
    orderSuccessTitle: 'Order request sent',
    orderSuccessBody: 'We received your request and will contact you with availability and next steps.',
    browseMore: 'Browse more',
    howItWorksTitle: 'How ordering works',
    flowLabel: 'Flow',
    stepOneTitle: 'Choose products',
    stepOneBody: 'Filter by category, search by design, and open any product to review the details.',
    stepTwoTitle: 'Send your request',
    stepTwoBody: 'Tell us the quantity, color preference, and any delivery or project notes.',
    stepThreeTitle: 'Get confirmation',
    stepThreeBody: 'Admin and shop teams get notified so they can confirm stock, quote, and fulfill fast.',
    supportTitle: 'What happens after you submit',
    operationsLabel: 'Operations',
    supportBody: 'We keep the first step lightweight: your request is captured, routed internally, and can trigger WhatsApp notifications for faster follow-up.',
    adminLabel: 'Admin',
    shopLabel: 'Shop',
    customerLabel: 'Customer',
    supportAdmin: 'Admin receives the new order summary.',
    supportShop: 'Shop or warehouse can prepare stock checks.',
    supportCustomer: 'Customer can receive a confirmation message when WhatsApp is configured.',
    toastOrderPlaced: 'Order request sent successfully.',
    toastOrderFailed: 'Could not send the order request.',
    toastLoadFailed: 'Could not load products right now.',
    validationName: 'Please enter your name.',
    validationEmail: 'Please enter a valid email address.',
    validationQuantity: 'Quantity must be greater than zero.',
  },
  si: {
    brandTag: 'රෙදිපිළි අමුද්‍රව්‍ය ඇණවුම් කිරීම සරලයි',
    customerSignup: 'පාරිභෝගික ලියාපදිංචිය',
    staffLogin: 'කාර්ය මණ්ඩල පිවිසුම',
    exploreCatalog: 'එකතුව බලන්න',
    requestOrder: 'ඇණවුමක් ඉල්ලන්න',
    catalogLabel: 'එකතුව',
    categoriesLabel: 'කාණ්ඩ',
    categoriesBody: 'ද්‍රව්‍ය පවුල හෝ භාවිතය අනුව පෙරහන් කරන්න.',
    followUpLabel: 'අනුගමනය',
    followUpBody: 'පරිපාලක, සාප්පු, සහ පාරිභෝගික දැනුම්දීම් ප්‍රවාහය සූදානම්.',
    heroTitle: 'සාප්පු, ව්‍යාපෘති සහ නැවත නැවත මිලදී ගන්නා පාරිභෝගිකයන් සඳහා උසස් රෙදිපිළි අමුද්‍රව්‍ය.',
    heroBody: 'අපගේ සජීවී එකතුව බලන්න, අවශ්‍ය ප්‍රමාණය යොමු කරන්න, සහ ලබාගත හැකි තොගය, වර්ණ ගැළපීම්, සහ බෙදාහැරීම් අපේ කණ්ඩායමෙන් තහවුරු කරගන්න.',
    heroHint: 'පාරිභෝගික ඇණවුම් සෘජුවම පරිපාලක සහ සාප්පු අනුගමන ප්‍රවාහයට යයි.',
    heroPrimary: 'ඇණවුම් කිරීම ආරම්භ කරන්න',
    heroSecondary: 'එකතුව බලන්න',
    searchPlaceholder: 'රෙදි, මෝස්තර, වර්ණ හෝ SKU සොයන්න...',
    allProducts: 'සියලුම නිෂ්පාදන',
    productsLabel: 'ඇණවුම් කිරීමට සූදානම් නිෂ්පාදන',
    matchingLabel: 'ගැලපෙන',
    noProductsTitle: 'නිෂ්පාදන හමු නොවීය',
    noProductsBody: 'වෙනත් සෙවුම් වචනයක් භාවිතා කරන්න හෝ නිෂ්පාදන කාණ්ඩය මාරු කරන්න.',
    orderModalTitle: 'නිෂ්පාදන විස්තර',
    orderFormTitle: 'ඇණවුම් ඉල්ලීම',
    yourName: 'ඔබගේ නම',
    email: 'ඊමේල්',
    phone: 'දුරකථනය හෝ WhatsApp',
    quantity: 'ප්‍රමාණය',
    colorPreference: 'වර්ණ කැමැත්ත',
    specialRequirements: 'විශේෂ අවශ්‍යතා',
    submitOrder: 'ඇණවුම් ඉල්ලීම යවන්න',
    submitting: 'යවමින්...',
    orderSuccessTitle: 'ඇණවුම් ඉල්ලීම යවා ඇත',
    orderSuccessBody: 'ඔබගේ ඉල්ලීම අපට ලැබී ඇත. ලබාගත හැකි බව සහ ඊළඟ පියවර සමඟ අපි ඔබව සම්බන්ධ කරගන්නෙමු.',
    browseMore: 'තවත් බලන්න',
    howItWorksTitle: 'ඇණවුම් කිරීම ක්‍රියාකරන ආකාරය',
    flowLabel: 'ප්‍රවාහය',
    stepOneTitle: 'නිෂ්පාදන තෝරන්න',
    stepOneBody: 'කාණ්ඩ අනුව පෙරහන් කරන්න, මෝස්තර අනුව සොයන්න, සහ විස්තර බැලීමට නිෂ්පාදනයක් විවෘත කරන්න.',
    stepTwoTitle: 'ඔබගේ ඉල්ලීම යවන්න',
    stepTwoBody: 'ප්‍රමාණය, වර්ණ කැමැත්ත, සහ බෙදාහැරීම හෝ ව්‍යාපෘති සටහන් ನಮට දන්වන්න.',
    stepThreeTitle: 'තහවුරු කිරීම ලබාගන්න',
    stepThreeBody: 'පරිපාලන සහ සාප්පු කණ්ඩායම් දැනුම්දීම් ලබාගෙන තොගය, මිලගණන්, සහ ඉක්මන් සපුරාලීම තහවුරු කරයි.',
    supportTitle: 'ඔබ ඉල්ලීම යැවූ පසු සිදුවන්නේ කුමක්ද',
    operationsLabel: 'ක්‍රියාකාරීත්වය',
    supportBody: 'පළමු පියවර සරලව තබා ගනිමු: ඔබගේ ඉල්ලීම සටහන් කර අභ්‍යන්තරව යොමු කරයි, සහ ඉක්මන් අනුගමනය සඳහා WhatsApp දැනුම්දීම්ද යැවිය හැක.',
    adminLabel: 'පරිපාලක',
    shopLabel: 'සාප්පුව',
    customerLabel: 'පාරිභෝගිකයා',
    supportAdmin: 'නව ඇණවුම් සාරාංශය පරිපාලක වෙත ලැබේ.',
    supportShop: 'සාප්පු හෝ ගබඩා කණ්ඩායමට තොග පරීක්ෂාව ආරම්භ කළ හැක.',
    supportCustomer: 'WhatsApp සකසා ඇත්නම් පාරිභෝගිකයාට තහවුරු කිරීමේ පණිවිඩයක් ලැබේ.',
    toastOrderPlaced: 'ඇණවුම් ඉල්ලීම සාර්ථකව යවා ඇත.',
    toastOrderFailed: 'ඇණවුම් ඉල්ලීම යැවිය නොහැකි විය.',
    toastLoadFailed: 'දැනට නිෂ්පාදන පූරණය කළ නොහැක.',
    validationName: 'කරුණාකර ඔබගේ නම ඇතුළත් කරන්න.',
    validationEmail: 'කරුණාකර වලංගු ඊමේල් ලිපිනයක් ඇතුළත් කරන්න.',
    validationQuantity: 'ප්‍රමාණය ශූන්‍යයට වඩා වැඩි විය යුතුය.',
  },
  ta: {
    brandTag: 'நூல் மற்றும் துணி மூலப்பொருள் ஆர்டர் செய்வது எளிது',
    customerSignup: 'வாடிக்கையாளர் பதிவு',
    staffLogin: 'பணியாளர் உள்நுழைவு',
    exploreCatalog: 'தொகுப்பைப் பாருங்கள்',
    requestOrder: 'ஆர்டர் கோரிக்கை அனுப்பு',
    catalogLabel: 'தொகுப்பு',
    categoriesLabel: 'வகைகள்',
    categoriesBody: 'பொருள் குடும்பம் அல்லது பயன்பாட்டின் அடிப்படையில் வடிகட்டுங்கள்.',
    followUpLabel: 'பின்தொடர்பு',
    followUpBody: 'நிர்வாகம், கடை, மற்றும் வாடிக்கையாளர் அறிவிப்பு ஓட்டம் தயார்.',
    heroTitle: 'கடைகள், திட்டங்கள், மற்றும் தொடர்ந்து வாங்கும் வாடிக்கையாளர்களுக்கான உயர்தர துணி மூலப்பொருட்கள்.',
    heroBody: 'எங்கள் நேரடி தொகுப்பைப் பாருங்கள், தேவையான அளவை அனுப்புங்கள், பின்னர் கிடைக்கும் இருப்பு, நிற பொருத்தம், மற்றும் விநியோக விருப்பங்களை எங்கள் குழு உறுதிப்படுத்தும்.',
    heroHint: 'வாடிக்கையாளர் ஆர்டர்கள் நேரடியாக நிர்வாக மற்றும் கடை பின்தொடர்பு ஓட்டத்திற்குச் செல்கின்றன.',
    heroPrimary: 'ஆர்டர் தொடங்கு',
    heroSecondary: 'தொகுப்பைப் பாருங்கள்',
    searchPlaceholder: 'துணி, வடிவம், நிறம், அல்லது SKU தேடுங்கள்...',
    allProducts: 'அனைத்து பொருட்களும்',
    productsLabel: 'ஆர்டர் செய்ய தயாரான பொருட்கள்',
    matchingLabel: 'பொருந்தும்',
    noProductsTitle: 'பொருட்கள் எதுவும் கிடைக்கவில்லை',
    noProductsBody: 'வேறு தேடல் சொல் முயற்சிக்கவும் அல்லது பொருள் வகையை மாற்றவும்.',
    orderModalTitle: 'பொருள் விவரங்கள்',
    orderFormTitle: 'ஆர்டர் கோரிக்கை',
    yourName: 'உங்கள் பெயர்',
    email: 'மின்னஞ்சல்',
    phone: 'தொலைபேசி அல்லது WhatsApp',
    quantity: 'அளவு',
    colorPreference: 'நிற விருப்பம்',
    specialRequirements: 'சிறப்பு தேவைகள்',
    submitOrder: 'ஆர்டர் கோரிக்கை அனுப்பு',
    submitting: 'அனுப்பப்படுகிறது...',
    orderSuccessTitle: 'ஆர்டர் கோரிக்கை அனுப்பப்பட்டது',
    orderSuccessBody: 'உங்கள் கோரிக்கை எங்களுக்கு கிடைத்தது. கிடைக்கும் இருப்பு மற்றும் அடுத்த படிகளுடன் விரைவில் தொடர்பு கொள்கிறோம்.',
    browseMore: 'மேலும் பார்க்க',
    howItWorksTitle: 'ஆர்டர் செயல்முறை',
    flowLabel: 'ஓட்டம்',
    stepOneTitle: 'பொருட்களைத் தேர்வு செய்யுங்கள்',
    stepOneBody: 'வகைப்படி வடிகட்டி, வடிவப்படி தேடி, விவரங்களைப் பார்க்க எந்த பொருளையும் திறக்கவும்.',
    stepTwoTitle: 'உங்கள் கோரிக்கையை அனுப்புங்கள்',
    stepTwoBody: 'அளவு, நிற விருப்பம், மற்றும் விநியோகம் அல்லது திட்ட குறிப்புகளை எங்களுக்கு தெரிவிக்கவும்.',
    stepThreeTitle: 'உறுதிப்படுத்தலைப் பெறுங்கள்',
    stepThreeBody: 'நிர்வாக மற்றும் கடை குழுக்கள் அறிவிப்பு பெற்று இருப்பு, விலை, மற்றும் வேகமான நிறைவேற்றத்தை உறுதி செய்கின்றன.',
    supportTitle: 'நீங்கள் கோரிக்கை அனுப்பிய பிறகு',
    operationsLabel: 'செயல்பாடு',
    supportBody: 'முதல் படியை எளிதாக வைத்திருக்கிறோம்: உங்கள் கோரிக்கை பதிவு செய்யப்படுகிறது, உள்ளகமாக அனுப்பப்படுகிறது, மேலும் வேகமான பின்தொடர்வுக்கு WhatsApp அறிவிப்புகளும் செல்லலாம்.',
    adminLabel: 'நிர்வாகம்',
    shopLabel: 'கடை',
    customerLabel: 'வாடிக்கையாளர்',
    supportAdmin: 'புதிய ஆர்டர் சுருக்கம் நிர்வாகத்திற்குச் செல்லும்.',
    supportShop: 'கடை அல்லது களஞ்சிய குழு இருப்பு சரிபார்ப்பைத் தொடங்கலாம்.',
    supportCustomer: 'WhatsApp அமைக்கப்பட்டிருந்தால் வாடிக்கையாளருக்கும் உறுதிப்படுத்தல் செய்தி கிடைக்கும்.',
    toastOrderPlaced: 'ஆர்டர் கோரிக்கை வெற்றிகரமாக அனுப்பப்பட்டது.',
    toastOrderFailed: 'ஆர்டர் கோரிக்கையை அனுப்ப முடியவில்லை.',
    toastLoadFailed: 'இந்த நேரத்தில் பொருட்களை ஏற்ற முடியவில்லை.',
    validationName: 'தயவுசெய்து உங்கள் பெயரை உள்ளிடுங்கள்.',
    validationEmail: 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடுங்கள்.',
    validationQuantity: 'அளவு பூஜ்யத்தை விட அதிகமாக இருக்க வேண்டும்.',
  },
}

export function resolveStorefrontLanguage(value: string | null | undefined): StorefrontLanguage {
  if (value && STOREFRONT_LANGUAGES.includes(value as StorefrontLanguage)) {
    return value as StorefrontLanguage
  }
  return 'en'
}