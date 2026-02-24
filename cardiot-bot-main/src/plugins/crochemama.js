import { command } from "../functions";

// =============================================
// MAIN START COMMAND - Entry Point
// =============================================
command(
  { pattern: "start" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      header: "Cardiot Academy 🇩🇪",
      body: "Guten Tag! Welcome to Cardiot Academy.\n\nWe are Kerala's premier German language institute, helping students and nurses confidently move to Germany.\n\nHow can we assist you today?",
      footer: "Cardiot Academy",
      button: "Explore Options",
      sections: [
        {
          title: "Main Menu",
          rows: [
            { id: "german_course", title: "📚 German Course", description: "A1-B2 Levels" },
            { id: "nurses_german", title: "👩‍⚕️ German For Nurses", description: "Free training program" },
            { id: "medical_german", title: "🏥 Medical German", description: "For healthcare pros" },
            { id: "study_work", title: "✈️ Study/Work Germany", description: "Guidance & support" },
            { id: "register", title: "💳 Register & Pay", description: "Enroll in courses" },
            { id: "faq", title: "❓ FAQs & Support", description: "Common questions" },
            { id: "contact", title: "📍 Contact & Location", description: "Reach us" }
          ]
        }
      ]
    };
    api.sendList(data);
  }
);

// =============================================
// GERMAN LANGUAGE COURSE - Level Selection
// =============================================
command(
  { pattern: "german_course" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "📚 *German Language Courses (A1-B2)*\n\nWe offer German language courses from A1 to B2, designed for beginners and advanced learners.\n\n✅ Exam-focused training\n✅ Small class sizes\n✅ Native German Speakers\n✅ Goethe Institute recognized\n\nSelect your level to learn more:",
      media: "https://res.cloudinary.com/dw0yk1zhz/image/upload/v1770731684/photo_2026-02-10_19-24-08_ll4ntw.jpg",
      buttons: [
        { id: "level_a1", title: "A1 Beginner", type: "reply" },
        { id: "level_a2", title: "A2 Elementary", type: "reply" },
        { id: "level_b1", title: "B1 Intermediate", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonMedia(data);
  }
);

// REMOVED THE BLOCKING COMMAND - THIS WAS THE ISSUE

// Level Details
const levelDetails = [
  {
    id: "level_a1",
    name: "A1 - Beginner",
    duration: "45 days (Intensive) / 60 days (Regular)",
    description: "Perfect for complete beginners. Learn basic German for everyday situations.",
    price: "₹15,000"
  },
  {
    id: "level_a2",
    name: "A2 - Elementary",
    duration: "45 days (Intensive) / 60 days (Regular)",
    description: "Build on A1 knowledge. Handle routine tasks requiring simple exchange of information.",
    price: "₹16,000"
  },
  {
    id: "level_b1",
    name: "B1 - Intermediate",
    duration: "60 days",
    description: "Handle most situations while traveling. Describe experiences and events.",
    price: "₹18,000"
  },
  {
    id: "level_b2",
    name: "B2 - Advanced",
    duration: "75 days",
    description: "Understand complex texts. Interact fluently with native speakers.",
    price: "₹20,000"
  }
];

levelDetails.forEach(level => {
  command(
    { pattern: level.id },
    // @ts-ignore
    async (api, params) => {
      const data = {
        text: `🎓 *${level.name}*\n\n⏱️ *Duration:* ${level.duration}\n💰 *Fee:* ${level.price}\n\n📝 *About:*\n${level.description}\n\n*What's Included:*\n• Study materials\n• Practice worksheets\n• Mock exams\n• Certificate\n• Goethe exam prep\n\nReady to start?`,
        buttons: [
          { id: "enquiry_" + level.id, title: "✅ Enquire", type: "reply" },
          { id: "register", title: "💳 Register", type: "reply" },
          { id: "more_levels", title: "🔙 All Levels", type: "reply" }
        ],
        footer: "Cardiot Academy"
      };
      api.sendButtonText(data);
    }
  );

  // Enquiry handler
  command(
    { pattern: "enquiry_" + level.id },
    // @ts-ignore
    async (api, params) => {
      const url = `https://wa.me/919599142177?text=Hi%2C%20I%20want%20to%20enquire%20about%20${encodeURIComponent(level.name)}%20course.`;
      const data = {
        text: `📞 *Connect with our counsellor*\n\nClick below to chat with us on WhatsApp for detailed info about ${level.name}:\n\n${url}\n\nOur team responds within 2 hours!`,
        buttons: [
          { id: "german_course", title: "🔙 Courses", type: "reply" },
          { id: "start", title: "Main Menu", type: "reply" }
        ],
        footer: "Cardiot Academy"
      };
      api.sendButtonText(data);
    }
  );
});

// More levels menu (includes B2)
command(
  { pattern: "more_levels" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      header: "German Course Levels 📚",
      body: "Select your desired level:",
      footer: "Cardiot Academy",
      button: "View Levels",
      sections: [
        {
          title: "Available Levels",
          rows: [
            { id: "level_a1", title: "A1 - Beginner", description: "₹15,000 | 45-60 days" },
            { id: "level_a2", title: "A2 - Elementary", description: "₹16,000 | 45-60 days" },
            { id: "level_b1", title: "B1 - Intermediate", description: "₹18,000 | 60 days" },
            { id: "level_b2", title: "B2 - Advanced", description: "₹20,000 | 75 days" }
          ]
        }
      ]
    };
    api.sendList(data);
  }
);

// =============================================
// GERMAN FOR NURSES - Free Training
// =============================================
command(
  { pattern: "nurses_german" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "👩‍⚕️ *German Language For Nurses*\n\n🎉 *FREE Training Program!*\n\nGerman training is *completely FREE* for nurses who complete processing through Cardiot Academy.\n\n💰 *Caution Deposit:* ₹70,000 (Refundable)\n✅ Full refund after successful processing\n\n*Benefits:*\n• A1 to B2 training\n• Medical terminology\n• Cultural orientation\n• Job placement help\n• Visa support\n\n*Eligibility:*\n• GNM/BSc Nursing\n• Valid license\n• Process through Cardiot",
      media: "https://res.cloudinary.com/dw0yk1zhz/image/upload/v1770731684/photo_2026-02-10_19-24-08_ll4ntw.jpg",
      buttons: [
        { id: "nurses_enquiry", title: "✅ I'm Interested", type: "reply" },
        { id: "medical_german", title: "Medical German", type: "reply" },
        { id: "start", title: "🔙 Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonMedia(data);
  }
);

command(
  { pattern: "nurses_enquiry" },
  // @ts-ignore
  async (api, params) => {
    const url = "https://wa.me/919599142177?text=Hi%2C%20I%27m%20a%20nurse%20interested%20in%20the%20FREE%20German%20training%20program.%20Please%20share%20more%20details.";
    const data = {
      text: `🎯 *Great Choice!*\n\nOur coordinator will guide you:\n\n✓ Eligibility check\n✓ Required documents\n✓ Batch schedules\n✓ Processing timeline\n✓ Refund process\n\nConnect now:\n${url}`,
      buttons: [
        { id: "start", title: "Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

// =============================================
// MEDICAL GERMAN - Video & Details
// =============================================
command(
  { pattern: "medical_german" },
  // @ts-ignore
  async (api, params) => {
    // First send the faculty photos
    await api.sendMedia("https://res.cloudinary.com/dw0yk1zhz/image/upload/v1770731684/photo_2026-02-10_19-24-08_ll4ntw.jpg");

    // Then send the video
    await api.sendMedia("https://res.cloudinary.com/dw0yk1zhz/video/upload/v1770731729/video_2026-02-10_19-24-17_umhbtu.mp4");

    // Follow-up with details
    const data = {
      text: "🩺 *Medical German Program*\n\nFor nurses & healthcare professionals:\n\n• Clinical terminology\n• Patient communication\n• Medical documentation\n• Hospital procedures\n• German healthcare system\n• Goethe exam prep\n\n*Features:*\n✅ Expert medical faculty\n✅ Real-world scenarios\n✅ Interactive sessions\n✅ Practical assessments\n\nEnroll in next batch?",
      buttons: [
        { id: "medical_enquiry", title: "✅ Yes, Enquiry", type: "reply" },
        { id: "start", title: "🔙 Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

command(
  { pattern: "medical_enquiry" },
  // @ts-ignore
  async (api, params) => {
    const url = "https://wa.me/919599142177?text=Hi%2C%20I%20want%20to%20know%20more%20about%20the%20Medical%20German%20program.";
    api.sendText(`📞 Connect with our Medical German specialist:\n\n${url}\n\nThey'll provide:\n• Batch schedules\n• Course fee details\n• Demo class info\n• Enrollment process`);
  }
);

// =============================================
// STUDY/WORK IN GERMANY
// =============================================
command(
  { pattern: "study_work" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      header: "Study/Work in Germany 🇩🇪",
      body: "We provide guidance for students and professionals moving to Germany.\n\nSelect an option:",
      footer: "Cardiot Academy",
      button: "Select Option",
      sections: [
        {
          title: "Opportunities",
          rows: [
            { id: "ausbildung", title: "Ausbildung Program", description: "Vocational training" },
            { id: "nursing_jobs", title: "Nursing Jobs", description: "Healthcare opportunities" },
            { id: "higher_studies", title: "Higher Studies", description: "University programs" }
          ]
        }
      ]
    };
    api.sendList(data);
  }
);

command(
  { pattern: "ausbildung" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "🎓 *Ausbildung Program*\n\nGermany's dual vocational training:\n• Theoretical education\n• Practical work experience\n• Monthly stipend (€800-€1200)\n\n*Popular Fields:*\n✓ Healthcare/Nursing\n✓ IT/Technology\n✓ Engineering\n✓ Hospitality\n\n*Our Support:*\n• B1/B2 German training\n• Application help\n• Interview prep\n• Visa processing\n\nWe arrange interviews after B2 completion.",
      buttons: [
        { id: "ausbildung_enq", title: "Learn More", type: "reply" },
        { id: "study_work", title: "🔙 Back", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

command(
  { pattern: "nursing_jobs" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "👩‍⚕️ *Nursing Jobs in Germany*\n\n*Requirements:*\n• GNM/BSc Nursing\n• B1/B2 German\n• Valid license\n\n*Salary:*\n€2,500 - €3,500/month\n\n*Our Services:*\n✓ German training (B1/B2)\n✓ Job placement\n✓ License recognition\n✓ Interview coordination\n✓ Visa processing\n\nWe arrange interviews after B2 completion.",
      buttons: [
        { id: "nursing_enq", title: "I'm Interested", type: "reply" },
        { id: "study_work", title: "🔙 Back", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

command(
  { pattern: "higher_studies" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "📚 *Higher Studies in Germany*\n\n*Why Germany?*\n• Low/No tuition fees\n• World-class education\n• Post-study work options\n• Strong job market\n\n*Requirements:*\n✓ Bachelor's degree\n✓ B2/C1 German\n✓ IELTS/TOEFL (English)\n\n*Note:* We're primarily a language academy. We provide training to prepare you for German universities.",
      buttons: [
        { id: "studies_enq", title: "Get Details", type: "reply" },
        { id: "study_work", title: "🔙 Back", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

// Enquiry handlers for study/work options
["ausbildung_enq", "nursing_enq", "studies_enq"].forEach(pattern => {
  command(
    { pattern },
    // @ts-ignore
    async (api, params) => {
      const url = "https://wa.me/919599142177?text=Hi%2C%20I%20want%20information%20about%20opportunities%20in%20Germany.";
      api.sendText(`📞 Our counsellor will guide you:\n\n${url}`);
    }
  );
});

// =============================================
// REGISTRATION & PAYMENT FLOW
// =============================================
command(
  { pattern: "register" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      header: "Register & Pay 💳",
      body: "Great decision! 🎓\n\nWhich course are you registering for?",
      footer: "Cardiot Academy",
      button: "Select Course",
      sections: [
        {
          title: "Available Courses",
          rows: [
            { id: "reg_a1", title: "A1 Beginner", description: "Fee: ₹15,000" },
            { id: "reg_a2", title: "A2 Elementary", description: "Fee: ₹16,000" },
            { id: "reg_b1", title: "B1 Intermediate", description: "Fee: ₹18,000" },
            { id: "reg_b2", title: "B2 Advanced", description: "Fee: ₹20,000" },
            { id: "reg_medical", title: "Medical German", description: "Contact for fee" }
          ]
        }
      ]
    };
    api.sendList(data);
  }
);

// Registration handlers
const registrationCourses = [
  { id: "reg_a1", name: "A1 Beginner", fee: "₹15,000" },
  { id: "reg_a2", name: "A2 Elementary", fee: "₹16,000" },
  { id: "reg_b1", name: "B1 Intermediate", fee: "₹18,000" },
  { id: "reg_b2", name: "B2 Advanced", fee: "₹20,000" },
  { id: "reg_medical", name: "Medical German", fee: "Contact us" }
];

registrationCourses.forEach(course => {
  command(
    { pattern: course.id },
    // @ts-ignore
    async (api, params) => {
      const data = {
        text: `📋 *Registration Summary*\n\n*Course:* ${course.name}\n*Total Fee:* ${course.fee}\n\nTo complete registration, provide:\n\n1️⃣ Full Name\n2️⃣ Qualification\n3️⃣ Contact Number\n4️⃣ Preferred Batch\n\nTap below to proceed:`,
        buttons: [
          { id: "pay_" + course.id, title: "💳 Proceed to Pay", type: "reply" },
          { id: "register", title: "🔙 Change Course", type: "reply" },
          { id: "start", title: "Main Menu", type: "reply" }
        ],
        footer: "Cardiot Academy"
      };
      api.sendButtonText(data);
    }
  );

  // Payment handler (FAKE for now)
  command(
    { pattern: "pay_" + course.id },
    // @ts-ignore
    async (api, params) => {
      // Send the notice/brochure PDF
      await api.sendMedia("./assets/Cardiot Notice 2026.pdf");

      const fakePaymentUrl = `https://wa.me/919599142177?text=I%20want%20to%20complete%20payment%20for%20${encodeURIComponent(course.name)}`;

      const data = {
        text: `💳 *Payment Gateway*\n\n*Course:* ${course.name}\n*Amount:* ${course.fee}\n\n🔐 Secure Payment:\n• UPI\n• Net Banking\n• Debit/Credit Card\n\n📄 Review the attached fee structure.\n\nProceed:\n${fakePaymentUrl}\n\n✅ Team contacts within 2 hours after payment.`,
        buttons: [
          { id: "payment_success", title: "✅ I've Paid", type: "reply" },
          { id: "start", title: "Main Menu", type: "reply" }
        ],
        footer: "Cardiot Academy"
      };
      api.sendButtonText(data);
    }
  );
});

// Payment success handler
command(
  { pattern: "payment_success" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "🎉 *Payment Confirmed!*\n\nThank you for choosing Cardiot Academy!\n\n✅ Team will contact you within 2 hours.\n\nYou'll receive:\n• Payment receipt\n• Welcome kit\n• Batch schedule\n• Course materials\n\n📧 Confirmation email sent.\n\nWelcome to Cardiot family! 🇩🇪",
      buttons: [
        { id: "start", title: "Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

// =============================================
// FAQs & SUPPORT
// =============================================
command(
  { pattern: "faq" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      header: "FAQs & Support ❓",
      body: "Common questions. Select a topic:",
      footer: "Cardiot Academy",
      button: "Select Topic",
      sections: [
        {
          title: "FAQ Categories",
          rows: [
            { id: "faq_course", title: "Course & Exams", description: "Duration, certificates" },
            { id: "faq_facilities", title: "Accommodation", description: "Hostel facilities" },
            { id: "faq_visa", title: "Visa & Jobs", description: "Placement, processing" },
            { id: "faq_fees", title: "Fees & Payment", description: "Payment options" }
          ]
        }
      ]
    };
    api.sendList(data);
  }
);

command(
  { pattern: "faq_course" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "📚 *Course & Exams FAQs*\n\n*Q: Is certificate valid in Germany?*\nA: Yes! We prepare for Goethe exams recognized in German-speaking countries for visa and jobs.\n\n*Q: How long is A1 course?*\nA: 45 days (Intensive) or 60 days (Regular).\n\n*Q: Class size?*\nA: 10-15 students for personalized attention.\n\n*Q: Study materials provided?*\nA: Yes, comprehensive materials and worksheets included.",
      buttons: [
        { id: "faq", title: "🔙 All FAQs", type: "reply" },
        { id: "start", title: "Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

command(
  { pattern: "faq_facilities" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "🏠 *Accommodation FAQs*\n\n*Q: Hostel facilities available?*\nA: Yes! Safe hostels for students after +2, for boys and girls.\n\n*Q: Hostel fees?*\nA: Contact us for current rates and availability.\n\n*Q: Meals included?*\nA: Arrangements vary. We'll share details during admission.",
      buttons: [
        { id: "faq", title: "🔙 All FAQs", type: "reply" },
        { id: "start", title: "Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

command(
  { pattern: "faq_visa" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "✈️ *Visa & Jobs FAQs*\n\n*Q: Job placement provided?*\nA: We're mainly a language academy. After B2, we arrange interviews for nurses and provide processing support. Same for Ausbildung students.\n\n*Q: Visa processing help?*\nA: Yes, for B2 completers we provide visa guidance and documentation.\n\n*Q: Success rate?*\nA: High success rate. Contact for detailed stats.",
      buttons: [
        { id: "faq", title: "🔙 All FAQs", type: "reply" },
        { id: "start", title: "Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

command(
  { pattern: "faq_fees" },
  // @ts-ignore
  async (api, params) => {
    const data = {
      text: "💰 *Fees & Payment FAQs*\n\n*Q: Installment payments?*\nA: Yes, we offer flexible plans. Contact office for details.\n\n*Q: Payment methods?*\nA: UPI, Net Banking, Debit/Credit Cards, Cash at office.\n\n*Q: Refund policy?*\nA: Yes, based on withdrawal timing. Check with team for terms.\n\n*Q: Hidden charges?*\nA: No, all fees transparent. Includes study materials and exam prep.",
      buttons: [
        { id: "faq", title: "🔙 All FAQs", type: "reply" },
        { id: "start", title: "Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

// =============================================
// CONTACT & LOCATION
// =============================================
command(
  { pattern: "contact" },
  // @ts-ignore
  async (api, params) => {
    // Send office photo
    await api.sendMedia("https://res.cloudinary.com/dw0yk1zhz/image/upload/v1770731684/photo_2026-02-10_19-24-08_ll4ntw.jpg");

    const data = {
      text: "📍 *Cardiot Academy*\n\n🏢 *Address:*\nSt. Johns Building\nKacheripady, Thiruvalla\nKerala, India\n\n⏰ *Office Hours:*\nMonday - Saturday\n9:00 AM – 4:30 PM\n\n📞 *Contact:*\n+91 95991 42177\n\n🌐 *Website:*\ncardiotacademy.com\n\nVisit us or get in touch!",
      buttons: [
        { id: "call_now", title: "📞 Call Now", type: "reply" },
        { id: "get_location", title: "📍 Get Directions", type: "reply" },
        { id: "start", title: "Main Menu", type: "reply" }
      ],
      footer: "Cardiot Academy"
    };
    api.sendButtonText(data);
  }
);

command(
  { pattern: "call_now" },
  // @ts-ignore
  async (api, params) => {
    api.sendText("📞 Call us: +91 95991 42177\n\nOffice hours:\nMonday - Saturday\n9:00 AM – 4:30 PM");
  }
);

command(
  { pattern: "get_location" },
  // @ts-ignore
  async (api, params) => {
    const mapUrl = "https://maps.google.com/?q=Cardiot+Academy+Thiruvalla+Kacheripady";
    api.sendText(`📍 *Get Directions*\n\nOpen in Google Maps:\n\n${mapUrl}\n\nSee you at Cardiot Academy!`);
  }
);

// =============================================
// TRIGGER KEYWORDS (Alternative Entry Points)
// =============================================

// Standard explicit keywords
const exactKeywords = ["hello", "german", "course", "cardiot"];

exactKeywords.forEach(keyword => {
  command(
    { pattern: keyword },
    // @ts-ignore
    async (api, params) => {
      sendWelcomeMessage(api);
    }
  );
});

// Trigger for any message starting with "hi", such as "hi", "hi instagram", "hi qr code"
// This allows auto-source tracking messages (wa.me/?text=Hi%20instagram) to trigger the bot normally.
command(
  { pattern: "hi(.*)" },
  // @ts-ignore
  async (api, params) => {
    sendWelcomeMessage(api);
  }
);

// @ts-ignore
function sendWelcomeMessage(api) {
  const data = {
    header: "Cardiot Academy 🇩🇪",
    body: "Guten Tag! Welcome to Cardiot Academy.\n\nWe are Kerala's premier German language institute, helping students and nurses confidently move to Germany.\n\nHow can we assist you today?",
    footer: "Cardiot Academy",
    button: "Explore Options",
    sections: [
      {
        title: "Main Menu",
        rows: [
          { id: "german_course", title: "📚 German Course", description: "A1-B2 Levels" },
          { id: "nurses_german", title: "👩‍⚕️ German For Nurses", description: "Free training program" },
          { id: "medical_german", title: "🏥 Medical German", description: "For healthcare pros" },
          { id: "study_work", title: "✈️ Study/Work Germany", description: "Guidance & support" },
          { id: "register", title: "💳 Register & Pay", description: "Enroll in courses" },
          { id: "faq", title: "❓ FAQs & Support", description: "Common questions" },
          { id: "contact", title: "📍 Contact & Location", description: "Reach us" }
        ]
      }
    ]
  };
  api.sendList(data);
}