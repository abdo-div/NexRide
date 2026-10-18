export type LegalDocumentKey = "terms" | "privacy" | "cancellation";
export type LegalLanguage = "en" | "ar";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  shortTitle: string;
  eyebrow: string;
  summary: string;
  effectiveLabel: string;
  effectiveDate: string;
  important: string;
  sections: LegalSection[];
}

type LocalizedLegalDocument = Record<LegalLanguage, LegalDocument>;

export const legalDocuments: Record<LegalDocumentKey, LocalizedLegalDocument> = {
  terms: {
    en: {
      title: "Terms of Service",
      shortTitle: "Terms",
      eyebrow: "Customer agreement",
      summary:
        "These terms govern access to NexRide and bookings made between customers and participating rental companies.",
      effectiveLabel: "Effective",
      effectiveDate: "16 October 2026",
      important:
        "The vehicle listing, checkout summary, booking confirmation and rental company's disclosed conditions form part of your agreement. Mandatory rights under Libyan law are not excluded.",
      sections: [
        {
          title: "1. Platform and contracting parties",
          paragraphs: [
            "NexRide Libya Mobility Technologies operates a marketplace and booking platform. The rental company identified in a vehicle listing supplies the vehicle and performs the rental. NexRide provides the booking, payment, account and support technology unless a checkout screen expressly states otherwise.",
          ],
        },
        {
          title: "2. Accounts and eligibility",
          bullets: [
            "Provide accurate identity, contact and driver information and keep it current.",
            "Keep account credentials confidential and notify support promptly of suspected misuse.",
            "The primary driver must hold a valid licence and meet the age, identity and eligibility rules displayed for the selected vehicle.",
            "A rental company may verify documents at handover and may refuse handover where legal or disclosed eligibility requirements are not met.",
          ],
        },
        {
          title: "3. Listings, bookings and prices",
          paragraphs: [
            "Availability is not guaranteed until a booking is confirmed. The checkout summary shows the rental price, selected extras, payment method and any disclosed deposit. Correct obvious pricing or availability errors may require cancellation and a refund of amounts actually collected.",
            "Customers must review dates, vehicle, pickup method, operator and total before confirming. A booking may not be transferred without approval from NexRide and the rental company.",
          ],
        },
        {
          title: "4. Payment and deposits",
          paragraphs: [
            "Payments may be processed by Moamalat or another payment provider shown at checkout, or collected under an available cash-on-delivery option. NexRide does not collect or store full card details entered into a payment provider's interface.",
            "A deposit, authorization hold, traffic fine, damage charge or other post-rental amount is enforceable only when disclosed in the booking or rental conditions and supported by the applicable agreement and law.",
          ],
        },
        {
          title: "5. Vehicle use and customer responsibilities",
          bullets: [
            "Use the vehicle lawfully, carefully and only within the permitted territory and rental period.",
            "Do not permit an unauthorized driver, sub-rent the vehicle, race, tow, overload or use it for an unlawful purpose.",
            "Report accidents, theft, warning lights and material damage promptly and cooperate with the rental company and competent authorities.",
            "Return the vehicle, keys, documents and included equipment at the agreed place and time, subject to the recorded fuel, mileage and condition terms.",
          ],
        },
        {
          title: "6. Cancellation, suspension and liability",
          paragraphs: [
            "The Cancellation and Refund Policy applies to customer cancellations and is incorporated into these terms. NexRide may suspend an account or booking to prevent fraud, protect users, comply with law or address a material breach.",
            "Each party remains responsible for loss it causes under the agreement and applicable law. Nothing in these terms excludes liability or consumer rights that cannot lawfully be excluded.",
          ],
        },
        {
          title: "7. Complaints, law and changes",
          paragraphs: [
            "Contact NexRide support first with the booking reference and relevant evidence so the platform and rental company can investigate. These terms are governed by the laws applicable in Libya, and disputes are handled by the competent Libyan courts unless mandatory law requires otherwise.",
            "Material changes apply prospectively from the effective date shown on this page. The version accepted when a booking is confirmed continues to govern that booking unless a change is required by law or benefits the customer.",
          ],
        },
      ],
    },
    ar: {
      title: "شروط الاستخدام",
      shortTitle: "الشروط",
      eyebrow: "اتفاقية العميل",
      summary: "تنظم هذه الشروط استخدام منصة نيكس رايد والحجوزات المبرمة بين العملاء وشركات التأجير المشاركة.",
      effectiveLabel: "تاريخ السريان",
      effectiveDate: "16 أكتوبر 2026",
      important: "تُعد بيانات المركبة وملخص الدفع وتأكيد الحجز والشروط المعلنة لشركة التأجير جزءاً من الاتفاقية. ولا تستبعد هذه الشروط أي حقوق إلزامية يقررها القانون الليبي.",
      sections: [
        { title: "1. المنصة وأطراف التعاقد", paragraphs: ["تدير نيكس رايد ليبيا لتقنيات التنقل منصة للحجز والوساطة. تتولى شركة التأجير المحددة في صفحة المركبة توفير المركبة وتنفيذ الإيجار، بينما توفر نيكس رايد تقنيات الحجز والدفع والحساب والدعم ما لم يرد خلاف ذلك صراحة أثناء الدفع."] },
        { title: "2. الحساب والأهلية", bullets: ["تقديم بيانات صحيحة ومحدثة للهوية والتواصل والسائق.", "المحافظة على سرية بيانات الدخول وإبلاغ الدعم فور الاشتباه في إساءة استخدامها.", "يجب أن يحمل السائق الأساسي رخصة سارية وأن يستوفي شروط العمر والهوية والأهلية المبينة للمركبة.", "يجوز لشركة التأجير التحقق من المستندات عند التسليم ورفضه إذا لم تتحقق المتطلبات القانونية أو المعلنة."] },
        { title: "3. العروض والحجوزات والأسعار", paragraphs: ["لا يُضمن التوفر حتى تأكيد الحجز. يبين ملخص الدفع سعر الإيجار والإضافات وطريقة الدفع وأي تأمين معلن. وقد يستلزم الخطأ الواضح في السعر أو التوفر إلغاء الحجز ورد المبالغ المحصلة فعلياً.", "يجب مراجعة التواريخ والمركبة ومكان الاستلام والشركة والمبلغ الإجمالي قبل التأكيد، ولا يجوز نقل الحجز للغير دون موافقة نيكس رايد وشركة التأجير."] },
        { title: "4. الدفع والتأمينات", paragraphs: ["قد تتم معالجة الدفع عبر معاملات أو مزود دفع آخر ظاهر أثناء الدفع، أو وفق خيار الدفع النقدي عند الاستلام إن كان متاحاً. لا تجمع نيكس رايد بيانات البطاقة الكاملة المدخلة في واجهة مزود الدفع ولا تخزنها.", "لا يُطالب بتأمين أو حجز مبلغ أو مخالفة مرورية أو تكلفة ضرر أو مبلغ لاحق إلا إذا كان معلناً في الحجز أو شروط الإيجار ومسنوداً بالاتفاق والقانون المعمول به."] },
        { title: "5. استخدام المركبة ومسؤوليات العميل", bullets: ["استخدام المركبة بصورة قانونية وآمنة وداخل النطاق والمدة المسموح بهما.", "عدم تمكين سائق غير مصرح له أو إعادة التأجير أو السباق أو القطر أو التحميل الزائد أو الاستخدام غير المشروع.", "الإبلاغ الفوري عن الحوادث أو السرقة أو إشارات التحذير أو الأضرار الجوهرية والتعاون مع الشركة والجهات المختصة.", "إعادة المركبة والمفاتيح والمستندات والتجهيزات في المكان والوقت المتفق عليهما وفق شروط الوقود والمسافة والحالة المسجلة."] },
        { title: "6. الإلغاء والتعليق والمسؤولية", paragraphs: ["تسري سياسة الإلغاء والاسترداد على إلغاءات العملاء وتعد جزءاً من هذه الشروط. ويجوز لنيكس رايد تعليق حساب أو حجز لمنع الاحتيال أو حماية المستخدمين أو الامتثال للقانون أو معالجة مخالفة جوهرية.", "يبقى كل طرف مسؤولاً عن الضرر الذي يسببه وفق الاتفاق والقانون، ولا تستبعد هذه الشروط أي مسؤولية أو حق للمستهلك لا يجوز استبعاده قانوناً."] },
        { title: "7. الشكاوى والقانون والتعديلات", paragraphs: ["يُرجى التواصل أولاً مع دعم نيكس رايد مع رقم الحجز والأدلة ذات الصلة لتمكين المنصة وشركة التأجير من التحقيق. تخضع هذه الشروط للقوانين المعمول بها في ليبيا وتختص المحاكم الليبية المختصة بالنزاعات ما لم يوجب القانون خلاف ذلك.", "تسري التعديلات الجوهرية مستقبلاً من التاريخ المبين في الصفحة، وتظل النسخة المقبولة عند تأكيد الحجز حاكمة له ما لم يكن التعديل مطلوباً قانوناً أو أصلح للعميل."] },
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy Notice",
      shortTitle: "Privacy",
      eyebrow: "Personal information",
      summary: "This notice explains what NexRide collects, why it is used, when it is shared and the choices available to users.",
      effectiveLabel: "Effective",
      effectiveDate: "16 October 2026",
      important: "Payment card details are entered directly with the displayed payment provider. NexRide receives transaction status and reference data, not the full card number or security code.",
      sections: [
        { title: "1. Information we collect", bullets: ["Account and identity details such as name, email, phone number, role and profile photo.", "Driver, booking, pickup, rental, cancellation and support information.", "For partner applications: business, ownership, licence, registry, fleet, payout and verification documents.", "Payment references, amount, status, refund and settlement records supplied by the payment provider or rental company.", "Security and technical data such as IP address, request time, browser information and authentication events.", "Newsletter preferences and messages voluntarily sent to support."] },
        { title: "2. How information is used", bullets: ["Create and secure accounts, verify eligibility and authenticate users.", "Search availability, create and manage bookings, perform payments, refunds, invoices and partner payouts.", "Prevent fraud, enforce tenant separation, investigate incidents and maintain service reliability.", "Communicate booking, application, account and support updates.", "Meet accounting, legal, regulatory and dispute-handling obligations and improve the service using aggregated operational information."] },
        { title: "3. Sharing", paragraphs: ["Information is shared only as needed with the rental company fulfilling a booking, the payment provider processing a transaction, infrastructure and communications suppliers acting for NexRide, professional advisers, and competent authorities where lawfully required. NexRide does not sell personal information."] },
        { title: "4. Cookies and authentication", paragraphs: ["NexRide uses an essential HTTP-only session cookie to keep users signed in and prevent browser JavaScript from reading the authentication token. Language and visual preferences may be stored locally in the browser. Essential authentication cannot operate without its cookie."] },
        { title: "5. Retention and security", paragraphs: ["Information is retained only for as long as reasonably needed for an active account or booking and for applicable accounting, legal, fraud-prevention and dispute periods. Partner verification documents are kept in protected private storage. Access controls, encrypted transport, logging safeguards and tenant isolation reduce risk, but no system can promise absolute security."] },
        { title: "6. Your choices and requests", paragraphs: ["Users may review and correct profile information in their account and may ask support for access, correction or deletion of personal information. A request may be limited where records must be retained for a booking, payment, legal claim, fraud prevention or another lawful obligation. Newsletter consent can be withdrawn at any time."] },
        { title: "7. Contact and updates", paragraphs: ["Privacy questions or requests can be submitted to NexRide support using the contact information displayed in the application. Include enough account information for verification, but never send a password or card security code. Material changes will be posted here with a new effective date."] },
      ],
    },
    ar: {
      title: "إشعار الخصوصية",
      shortTitle: "الخصوصية",
      eyebrow: "البيانات الشخصية",
      summary: "يوضح هذا الإشعار البيانات التي تجمعها نيكس رايد وأسباب استخدامها ومتى تُشارك والخيارات المتاحة للمستخدم.",
      effectiveLabel: "تاريخ السريان",
      effectiveDate: "16 أكتوبر 2026",
      important: "تُدخل بيانات البطاقة مباشرة لدى مزود الدفع الظاهر. تستلم نيكس رايد حالة المعاملة ومرجعها ولا تستلم رقم البطاقة الكامل أو رمز الأمان.",
      sections: [
        { title: "1. البيانات التي نجمعها", bullets: ["بيانات الحساب والهوية مثل الاسم والبريد والهاتف والدور وصورة الملف.", "بيانات السائق والحجز والاستلام والإيجار والإلغاء والدعم.", "لطلبات الشركاء: بيانات النشاط والملكية والتراخيص والسجل والأسطول والتحويل ومستندات التحقق.", "مرجع الدفع والمبلغ والحالة وبيانات الاسترداد والتسوية الواردة من مزود الدفع أو شركة التأجير.", "بيانات الأمان والتقنية مثل عنوان الشبكة ووقت الطلب والمتصفح وأحداث تسجيل الدخول.", "تفضيلات النشرة والرسائل المقدمة طوعاً إلى الدعم."] },
        { title: "2. أغراض الاستخدام", bullets: ["إنشاء الحسابات وحمايتها والتحقق من الأهلية وهوية المستخدم.", "البحث عن التوفر وإدارة الحجوزات والمدفوعات والاسترداد والفواتير وتحويلات الشركاء.", "منع الاحتيال وعزل بيانات الشركات والتحقيق في الحوادث والحفاظ على موثوقية الخدمة.", "إرسال تحديثات الحجز والطلب والحساب والدعم.", "الوفاء بالالتزامات المحاسبية والقانونية والتنظيمية وتسوية النزاعات وتحسين الخدمة ببيانات تشغيلية مجمعة."] },
        { title: "3. مشاركة البيانات", paragraphs: ["لا تُشارك البيانات إلا بالقدر اللازم مع شركة التأجير المنفذة للحجز، ومزود الدفع، وموردي البنية والاتصالات العاملين لحساب نيكس رايد، والمستشارين المهنيين، والجهات المختصة عند وجود طلب قانوني. ولا تبيع نيكس رايد البيانات الشخصية."] },
        { title: "4. ملفات الارتباط والمصادقة", paragraphs: ["تستخدم نيكس رايد ملف ارتباط أساسياً محمياً من وصول JavaScript للمحافظة على جلسة الدخول. وقد تُحفظ تفضيلات اللغة والمظهر محلياً في المتصفح. ولا تعمل المصادقة الأساسية دون ملف الارتباط الخاص بها."] },
        { title: "5. الاحتفاظ والأمان", paragraphs: ["تُحفظ البيانات للمدة اللازمة بصورة معقولة للحساب أو الحجز وللمدد المحاسبية والقانونية ومنع الاحتيال وتسوية النزاعات. تحفظ مستندات تحقق الشركاء في تخزين خاص محمي. وتحد ضوابط الوصول والنقل المشفر وحماية السجلات وعزل الشركات من المخاطر، دون إمكان ضمان الأمان المطلق لأي نظام."] },
        { title: "6. خياراتك وطلباتك", paragraphs: ["يمكن للمستخدم مراجعة بيانات ملفه وتصحيحها وطلب الوصول إلى بياناته أو تصحيحها أو حذفها من الدعم. وقد يُقيد الطلب إذا وجب الاحتفاظ بالسجلات لحجز أو دفع أو مطالبة قانونية أو منع الاحتيال أو التزام مشروع آخر. ويمكن سحب الاشتراك في النشرة في أي وقت."] },
        { title: "7. التواصل والتحديثات", paragraphs: ["يمكن تقديم أسئلة أو طلبات الخصوصية إلى دعم نيكس رايد عبر بيانات التواصل المعروضة في التطبيق. أرفق معلومات كافية للتحقق من الحساب ولا ترسل أبداً كلمة المرور أو رمز أمان البطاقة. ستُنشر التعديلات الجوهرية هنا مع تاريخ سريان جديد."] },
      ],
    },
  },
  cancellation: {
    en: {
      title: "Cancellation and Refund Policy",
      shortTitle: "Cancellation & refunds",
      eyebrow: "Booking policy",
      summary: "This policy explains when a customer can cancel and how NexRide calculates the refundable share of a collected booking payment.",
      effectiveLabel: "Effective",
      effectiveDate: "16 October 2026",
      important: "The free-cancellation window is configured by NexRide and shown in the booking experience. The exact pickup time and the server-recorded cancellation time determine the result.",
      sections: [
        { title: "1. Refund calculation", bullets: ["Cancel at least the full displayed free-cancellation window before pickup: 100% of the collected booking payment is eligible for refund.", "Cancel between one-half of that window and the full window before pickup: 50% is eligible for refund.", "Cancel less than one-half of that window before pickup: no refund is due under the standard policy."] },
        { title: "2. How to cancel", paragraphs: ["Use the cancellation action in My Bookings and provide an optional reason. A cancellation is effective only when the API records the booking as CANCELLED. Contact support with the booking reference if the action fails; abandoning the vehicle or not attending pickup is not a completed cancellation."] },
        { title: "3. Status restrictions", paragraphs: ["A booking cannot be customer-cancelled after it becomes ACTIVE or COMPLETED, or after it has already been cancelled. An unpaid booking can be cancelled without a payment refund because no completed payment was collected."] },
        { title: "4. Refund record and timing", paragraphs: ["For an eligible paid cancellation, NexRide records the payment as refunded or partially refunded and records the refund amount. The payment provider or support team confirms the return method and processing time. Bank and payment-network processing periods are outside NexRide's direct control."] },
        { title: "5. Provider or platform cancellation", paragraphs: ["If a rental company cannot supply the confirmed vehicle, it should offer a suitable replacement or coordinate cancellation. Refund rights for provider-caused cancellation, legal defects, duplicate collection or service not supplied remain subject to the booking facts and applicable mandatory law and are not reduced by the customer-cancellation timetable above."] },
        { title: "6. Evidence and disputes", paragraphs: ["Keep the booking reference, cancellation confirmation and payment evidence. Report an incorrect amount promptly through support. NexRide may request reasonable evidence and will review the booking timeline, payment ledger and operator records. This policy does not limit rights that cannot be limited under applicable law."] },
      ],
    },
    ar: {
      title: "سياسة الإلغاء والاسترداد",
      shortTitle: "الإلغاء والاسترداد",
      eyebrow: "سياسة الحجز",
      summary: "توضح هذه السياسة متى يمكن للعميل إلغاء الحجز وكيف تحسب نيكس رايد الجزء القابل للاسترداد من مبلغ الحجز المحصل.",
      effectiveLabel: "تاريخ السريان",
      effectiveDate: "16 أكتوبر 2026",
      important: "تحدد نيكس رايد نافذة الإلغاء المجاني وتعرضها ضمن تجربة الحجز. ويُعتد بوقت الاستلام المحدد ووقت الإلغاء المسجل في الخادم لحساب النتيجة.",
      sections: [
        { title: "1. حساب الاسترداد", bullets: ["الإلغاء قبل موعد الاستلام بمدة تساوي نافذة الإلغاء المجاني المعروضة أو تزيد عليها: يستحق رد 100% من مبلغ الحجز المحصل.", "الإلغاء قبل الاستلام بمدة تقع بين نصف النافذة وكاملها: يستحق رد 50%.", "الإلغاء قبل الاستلام بمدة تقل عن نصف النافذة: لا يستحق رد وفق السياسة القياسية."] },
        { title: "2. طريقة الإلغاء", paragraphs: ["استخدم إجراء الإلغاء في صفحة حجوزي ويمكنك إضافة سبب اختياري. لا يصبح الإلغاء نافذاً إلا عند تسجيل حالة الحجز «ملغي» في النظام. تواصل مع الدعم مع رقم الحجز إذا فشل الإجراء؛ فترك المركبة أو عدم الحضور للاستلام لا يعد إلغاءً مكتملاً."] },
        { title: "3. قيود الحالة", paragraphs: ["لا يمكن للعميل إلغاء الحجز بعد أن يصبح نشطاً أو مكتملاً أو إذا سبق إلغاؤه. ويمكن إلغاء الحجز غير المدفوع دون استرداد مالي لعدم وجود دفعة مكتملة التحصيل."] },
        { title: "4. تسجيل الاسترداد ومدته", paragraphs: ["عند استحقاق رد لحجز مدفوع، تسجل نيكس رايد الدفعة كمستردة كلياً أو جزئياً وتسجل مبلغ الاسترداد. يؤكد مزود الدفع أو فريق الدعم طريقة الإعادة ومدة تنفيذها، ولا تخضع مدد المصارف وشبكات الدفع للسيطرة المباشرة لنيكس رايد."] },
        { title: "5. إلغاء الشركة أو المنصة", paragraphs: ["إذا تعذر على شركة التأجير توفير المركبة المؤكدة، فعليها عرض بديل مناسب أو تنسيق الإلغاء. ولا تنتقص المواعيد أعلاه من الحقوق المتعلقة بإلغاء سببه المزود أو عيب قانوني أو تحصيل مكرر أو خدمة لم تُقدم، وتظل خاضعة لوقائع الحجز والقواعد القانونية الإلزامية."] },
        { title: "6. الأدلة والنزاعات", paragraphs: ["احتفظ برقم الحجز وتأكيد الإلغاء وإثبات الدفع، وأبلغ الدعم فوراً عن أي مبلغ غير صحيح. يجوز لنيكس رايد طلب أدلة معقولة ومراجعة التسلسل الزمني للحجز وسجل الدفع وبيانات الشركة. ولا تحد هذه السياسة من الحقوق التي لا يجوز تقييدها قانوناً."] },
      ],
    },
  },
};

export const getLegalDocument = (
  key: LegalDocumentKey,
  language: string,
): LegalDocument => legalDocuments[key][language.startsWith("ar") ? "ar" : "en"];
