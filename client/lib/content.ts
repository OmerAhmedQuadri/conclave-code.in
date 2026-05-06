/**
 * ─────────────────────────────────────────────────────────────────────
 *  EDIT THIS FILE TO CHANGE ANY VISIBLE TEXT ON THE SITE.
 *  No code knowledge required. Edit the strings, save, redeploy.
 * ─────────────────────────────────────────────────────────────────────
 */

export const content = {
  meta: {
    title: "Future Engineers Conclave · code.in",
    description:
      "An invitation-only evening for premium families navigating engineering education in the AI era. T-Hub, Hyderabad · May 23, 2026.",
  },

  brand: {
    eventName: "Future Engineers Conclave",
    chapter: "Hyderabad Chapter",
    presentedBy: "code.in",
  },

  landing: {
    label: "INVITATION-ONLY",
    title: "By invitation\nonly.",
    intro:
      "An evening for premium families navigating engineering education in the AI era. Forty families. One conversation. Entry is by personal invitation from code.in.",
    note: "If you've received an invitation by email, please use the link in that email to register. If not, you can request one below — we review every request personally.",
    primaryCta: "Request an invite",
    secondaryCta: "I already have one",
    closingTitle: "Think your family is a fit?",
    closingBody: "We review every request personally. Most invitations go out within 48 hours.",
  },

  request: {
    label: "REQUEST AN INVITE",
    title: "Tell us a little\nabout your family.",
    intro:
      "We have forty seats and review every request by hand. The more context you share, the better our shortlist. Most invites go out within 48 hours.",
    fields: {
      name: { label: "Your name", placeholder: "As you'd like us to address you" },
      email: { label: "Email", placeholder: "you@email.com" },
      city: { label: "City (optional)", placeholder: "Hyderabad" },
      reason: {
        label: "Why this evening interests you (optional)",
        placeholder:
          "Anything that helps us understand your situation — child's age, current school, the decision you're weighing.",
      },
    },
    submit: "Send request",
    submitting: "Sending...",
    privacy: "We'll only contact you about this event. No marketing, no third parties.",
    success: {
      label: "REQUEST RECEIVED",
      title: "Thank you.",
      body: "We've received your request. Our team reviews each one personally — if your family is a fit for this evening, an invitation will arrive in your inbox within 48 hours.",
      backLink: "Back to the event details",
    },
  },

  about: {
    label: "THE EVENING",
    title: "Engineering education,\nrethought for the AI era.",
    paragraphs: [
      "The Future Engineers Conclave is a closed-door evening hosted by code.in for forty families with engineering-track children. The world is changing faster than the curriculum — what we teach, what students should learn, and what employers will pay for in 2030 are three different conversations. We bring all three into one room.",
      "Expect a 90-minute panel followed by structured 1:1 time with the speakers and the code.in team. No pitch decks, no sales talk. Just the questions parents are quietly asking each other in WhatsApp groups — answered on the record.",
    ],
  },

  forWhom: {
    label: "WHO IT'S FOR",
    title: "Designed for forty families.",
    items: [
      {
        title: "Parents of 15–21 year olds",
        body: "Whose children are weighing CSE, AI/ML, IIT-JEE, study abroad, or a non-traditional path.",
      },
      {
        title: "Decision-makers, not browsers",
        body: "Families who are months away from a real decision and want signal, not noise.",
      },
      {
        title: "By personal invitation",
        body: "Each invitation comes from a code.in advisor, school principal, or trusted referral. No public sign-ups.",
      },
    ],
  },

  speakers: {
    label: "ON THE PANEL",
    title: "Three voices,\none honest conversation.",
    note: "Speaker lineup confirmed. Detailed bios on the panel page sent with your registration confirmation.",
    list: [
      {
        name: "Sami Mohammed",
        role: "Founder, code.in",
        bio: "Built India's first coding bootcamp in 2013. Has placed graduates at Google, Microsoft, and 300+ Indian startups. Known for blunt, useful career advice.",
        initials: "SM",
      },
      {
        name: "[Speaker name]",
        role: "[Title · Company]",
        bio: "[1–2 line bio. Edit this in lib/content.ts → speakers.list]",
        initials: "??",
      },
      {
        name: "[Speaker name]",
        role: "[Title · Company]",
        bio: "[1–2 line bio. Edit this in lib/content.ts → speakers.list]",
        initials: "??",
      },
    ],
  },

  format: {
    label: "FORMAT",
    title: "Two-and-a-half hours.\nNo wasted minutes.",
    schedule: [
      { time: "6:00 PM", title: "Doors open", body: "Registration, welcome drinks, name tags." },
      {
        time: "6:30 PM",
        title: "Opening",
        body: "Sami sets the room — what we're here to discuss, what's off the table.",
      },
      {
        time: "6:45 PM",
        title: "Panel",
        body: "90 minutes with the speakers. Pre-submitted questions are answered first; live Q&A follows.",
      },
      {
        time: "8:15 PM",
        title: "1:1 access",
        body: "Structured small-group time with the panel and code.in advisors. Bring specific questions.",
      },
      { time: "8:30 PM", title: "Close", body: "" },
    ],
  },

  faq: {
    label: "QUESTIONS WE ALREADY HEARD",
    items: [
      {
        q: "Can I bring my child?",
        a: "Yes — and we recommend it. The invitation is for one parent + the student. Both names go on the registration form.",
      },
      {
        q: "What if I can't make it?",
        a: "Please tell us — we have a waitlist of families who'd take your seat. WhatsApp Sami directly.",
      },
      {
        q: "Is there a cost?",
        a: "No. The evening is hosted by code.in. There's no fee, no donation ask, no hidden upsell.",
      },
      {
        q: "Will it be recorded?",
        a: "No. The panel is off-the-record by design. Speakers say things they wouldn't say on YouTube.",
      },
    ],
  },

  details: [
    { label: "DATE", value: "Saturday, May 23, 2026" },
    { label: "TIME", value: "6:00 PM – 8:30 PM" },
    { label: "VENUE", value: "T-Hub, Hyderabad" },
    { label: "DRESS", value: "Smart casual" },
    { label: "GUESTS", value: "Parent + student" },
  ],

  register: {
    label: "REGISTER YOUR ATTENDANCE",
    title: "Confirm your\ndetails.",
    intro:
      "Please share a few details so we can prepare for your visit. After this, we'll email you a 6-digit code to verify your address.",
    invalidTitle: "This invitation isn't valid.",
    invalidBody:
      "The link may be incorrect, expired, or already used. Please check your email or contact us on WhatsApp.",
    finalisedTitle: "This invitation is closed.",
    finalisedBody:
      "Your registration has already been processed. If you think this is a mistake, reach out to us on WhatsApp.",
  },

  otp: {
    label: "VERIFY YOUR EMAIL",
    title: "Enter the 6-digit code.",
    body: "We've sent a code to {email}. It expires in 10 minutes.",
    submit: "Verify",
    submitting: "Verifying...",
    resend: "Resend code",
    resending: "Resending...",
  },

  form: {
    sectionLabels: {
      parent: "PARENT DETAILS",
      student: "STUDENT DETAILS",
      additional: "A FEW MORE THINGS",
    },
    fields: {
      parentName: { label: "Your name", placeholder: "As you'd like it on your name tag" },
      parentPhone: { label: "Phone number", placeholder: "+91 9876543210" },
      studentName: { label: "Student's name", placeholder: "Your son or daughter's name" },
      studentAge: { label: "Student's age", placeholder: "Select age" },
      school: { label: "School or college", placeholder: "Currently attending" },
      city: { label: "City", placeholder: "Hyderabad" },
      referral: { label: "How did you hear about us?", placeholder: "Choose one" },
      question: {
        label: "A question you'd like the panel to address (optional)",
        placeholder: "What's on your mind?",
      },
    },
    referralOptions: [
      "School principal",
      "WhatsApp group",
      "Instagram",
      "A friend",
      "I know Sami personally",
      "Other",
    ],
    studentAgeOptions: ["15", "16", "17", "18", "19", "20", "21"],
    submit: "Send verification code",
    submitting: "Sending...",
    privacyNote: "We'll only contact you about this event. No spam, no third parties.",
  },

  waitlist: {
    label: "ON THE WAITLIST",
    title: "We've got your details.",
    body: "Your email is verified and your registration is now under review by the code.in team. You'll receive a confirmation by email once your seat is approved.",
    nextStepsTitle: "What happens next",
    nextSteps: [
      "Our team reviews your registration manually within 1-2 days.",
      "On approval, a confirmation email arrives with venue details.",
      "Final reminder + parking pass 24 hours before the event.",
    ],
    backLink: "Back to the event details",
  },

  confirmation: {
    label: "YOU'RE IN",
    title: "Your seat is confirmed.",
    body: "We've reviewed your registration and confirmed your seat. A reminder with venue directions and parking info will reach you on WhatsApp 24 hours before the event.",
    nextStepsTitle: "What happens next",
    nextSteps: [
      "Calendar invite arrives by email within 10 minutes.",
      "Personal WhatsApp from Sami a week before with the panel lineup.",
      "Final reminder + parking pass 24 hours before the event.",
    ],
    backLink: "Back to the event details",
  },

  footer: {
    presentedBy: "Presented by code.in",
    tagline: "Evolution of The Hacking School · India's first coding bootcamp, since 2013",
    contactLabel: "Questions?",
    legal: "© 2026 Bootcamp Innovations Pvt. Ltd.",
  },
} as const;

export type Content = typeof content;
