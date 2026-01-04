import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, Search, ArrowRight, BookOpen } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { FAQSearch } from "@/components/content/faq-search";
import { generateFAQSchema } from "@/lib/seo/schemas";

const BASE_URL = "https://www.findabatherapy.com";

export const metadata: Metadata = {
  title: "ABA Therapy FAQ | Frequently Asked Questions | Find ABA Therapy",
  description:
    "Get answers to common questions about ABA therapy, insurance coverage, costs, provider selection, and what to expect from treatment. Expert answers from certified BCBAs.",
  openGraph: {
    title: "ABA Therapy Frequently Asked Questions",
    description:
      "Comprehensive answers to the most common questions about Applied Behavior Analysis therapy for autism.",
    url: `${BASE_URL}/faq`,
    type: "website",
  },
  alternates: {
    canonical: "/faq",
  },
};

// Comprehensive FAQ categories with questions (using iconName strings for client component)
const faqCategories = [
  {
    id: "basics",
    title: "ABA Therapy Basics",
    iconName: "BookOpen" as const,
    faqs: [
      {
        question: "What is ABA therapy?",
        answer:
          "ABA (Applied Behavior Analysis) therapy is a scientific approach to understanding and changing behavior. It's the most widely researched and effective treatment for autism spectrum disorder, using positive reinforcement and data-driven methods to help children develop important skills in communication, social interaction, self-care, and academics.",
        link: "/learn/what-is-aba-therapy",
      },
      {
        question: "What does ABA stand for?",
        answer:
          "ABA stands for Applied Behavior Analysis. 'Applied' means the focus is on socially significant behaviors, 'Behavior' refers to observable and measurable actions, and 'Analysis' involves using data to understand and improve behavior.",
      },
      {
        question: "Is ABA therapy only for children with autism?",
        answer:
          "While ABA therapy is most commonly used for autism spectrum disorder, the principles can help anyone learn new skills or change behaviors. It's also used for ADHD, developmental delays, and behavioral challenges. However, insurance coverage is typically limited to autism diagnoses.",
      },
      {
        question: "At what age should a child start ABA therapy?",
        answer:
          "Research shows early intervention (ages 2-6) produces the best outcomes, but ABA therapy can be effective at any age. Many children start as early as 18 months after an autism diagnosis. The key is starting as soon as possible after diagnosis.",
        link: "/learn/aba-therapy-for-toddlers",
      },
      {
        question: "How long does ABA therapy take to show results?",
        answer:
          "Many families see initial improvements within 2-3 months of starting intensive ABA therapy. Significant progress typically takes 1-2 years of consistent treatment. The timeline varies based on the child's needs, treatment intensity, and specific goals.",
        link: "/learn/aba-therapy-results",
      },
      {
        question: "Is ABA therapy evidence-based?",
        answer:
          "Yes, ABA therapy is supported by over 50 years of research and is recognized by the U.S. Surgeon General, American Psychological Association, and American Academy of Pediatrics as an evidence-based best practice treatment for autism spectrum disorder.",
      },
      {
        question: "What skills does ABA therapy teach?",
        answer:
          "ABA therapy can address a wide range of skills including communication and language, social skills and play, self-care (toileting, dressing, eating), academic readiness, motor skills, and reducing challenging behaviors like tantrums or self-injury.",
      },
    ],
  },
  {
    id: "insurance",
    title: "Insurance & Costs",
    iconName: "HelpCircle" as const,
    faqs: [
      {
        question: "Does insurance cover ABA therapy?",
        answer:
          "Yes, most health insurance plans cover ABA therapy due to autism insurance mandates in all 50 states. Coverage varies by plan, so verify your specific benefits with your insurance provider. Medicaid also covers ABA therapy in all states.",
        link: "/learn/insurance-coverage-aba",
      },
      {
        question: "How much does ABA therapy cost without insurance?",
        answer:
          "Without insurance, ABA therapy typically costs $120-$200 per hour for direct therapy and $200-$350 per hour for BCBA services. With 20-40 hours per week recommended, annual costs can range from $50,000 to $150,000. This is why insurance coverage is so important.",
        link: "/learn/aba-therapy-cost",
      },
      {
        question: "What is prior authorization for ABA therapy?",
        answer:
          "Prior authorization is insurance company approval required before starting ABA therapy. It typically involves submitting the autism diagnosis, assessment results, and treatment plan. Your ABA provider usually handles this process, which can take 2-4 weeks.",
      },
      {
        question: "Does Medicaid cover ABA therapy?",
        answer:
          "Yes, Medicaid covers ABA therapy for children with autism in all 50 states under the Early and Periodic Screening, Diagnostic and Treatment (EPSDT) benefit. Coverage details vary by state, and some states have specific waiver programs for autism services.",
        link: "/insurance/medicaid",
      },
      {
        question: "What if my insurance denies ABA therapy coverage?",
        answer:
          "If your insurance denies coverage, you can file an appeal with additional documentation from your child's doctors and the ABA provider. Many initial denials are overturned on appeal. You may also contact your state insurance commissioner or seek help from autism advocacy organizations.",
      },
      {
        question: "Are there financial assistance programs for ABA therapy?",
        answer:
          "Yes, several options exist including state Medicaid programs, autism scholarships and grants, nonprofit organizations like Autism Speaks, sliding scale fees from providers, and healthcare credit options. Many ABA providers also offer payment plans.",
      },
    ],
  },
  {
    id: "providers",
    title: "Finding & Choosing Providers",
    iconName: "Search" as const,
    faqs: [
      {
        question: "How do I find ABA therapy providers near me?",
        answer:
          "Use our directory at Find ABA Therapy to search for providers by location. You can filter by insurance accepted, service types (in-home, center-based), and specialties. Also check your insurance provider's network directory.",
        link: "/search",
      },
      {
        question: "What credentials should an ABA provider have?",
        answer:
          "Look for Board Certified Behavior Analysts (BCBAs) who design and oversee treatment, and Registered Behavior Technicians (RBTs) who provide direct therapy. BCBAs have master's degrees and national certification. Verify credentials at bacb.com.",
        link: "/learn/how-to-choose-aba-provider",
      },
      {
        question: "What questions should I ask an ABA provider?",
        answer:
          "Key questions include: What is your staff turnover rate? How much BCBA supervision is provided? How do you measure progress? How are parents involved? What does a typical session look like? Can you provide references from other families?",
        link: "/learn/questions-to-ask-aba-providers",
      },
      {
        question: "What is the difference between in-home and center-based ABA?",
        answer:
          "In-home ABA occurs in your home, allowing skills to be taught in the natural environment where they'll be used. Center-based ABA takes place at a clinic with specialized equipment and peer interaction opportunities. Many families use a combination of both.",
        link: "/learn/in-home-vs-center-based-aba",
      },
      {
        question: "How long are ABA therapy waitlists?",
        answer:
          "Waitlists vary significantly by location and provider. In high-demand areas, waits can be 3-12 months. Ask multiple providers about their waitlist, and consider getting on several lists simultaneously. Some areas have more availability than others.",
      },
      {
        question: "Can I change ABA providers if we're not satisfied?",
        answer:
          "Yes, you can change providers at any time. Give proper notice per your agreement, request copies of your child's records and assessments, and ensure a smooth transition by sharing data with the new provider. Your child's progress is portable.",
      },
    ],
  },
  {
    id: "treatment",
    title: "Treatment & Sessions",
    iconName: "HelpCircle" as const,
    faqs: [
      {
        question: "How many hours of ABA therapy does my child need?",
        answer:
          "Research recommends 25-40 hours per week for comprehensive ABA therapy, though this varies by child. The BCBA will recommend hours based on your child's assessment, goals, and family situation. Some children do well with 10-15 hours focused on specific skills.",
        link: "/learn/aba-therapy-schedule",
      },
      {
        question: "What happens during an ABA therapy session?",
        answer:
          "Sessions involve one-on-one work between the therapist and child using structured teaching (discrete trials) and natural environment teaching. Activities are tailored to your child's goals and may include play-based learning, communication practice, social skills training, and self-care routines.",
        link: "/learn/aba-therapy-process",
      },
      {
        question: "What is a BCBA assessment?",
        answer:
          "A BCBA assessment evaluates your child's current skills, challenges, and learning style to create an individualized treatment plan. It typically includes direct observation, parent interviews, skill assessments (like the VB-MAPP or ABLLS-R), and identification of target goals.",
        link: "/learn/understanding-aba-assessment",
      },
      {
        question: "How is progress measured in ABA therapy?",
        answer:
          "Progress is measured through continuous data collection on specific goals. BCBAs analyze this data to track skill acquisition, behavior changes, and goal mastery. Families receive regular progress reports, typically monthly or quarterly.",
      },
      {
        question: "What is parent training in ABA therapy?",
        answer:
          "Parent training teaches you the same techniques therapists use so you can reinforce skills throughout the day. It's a critical component of effective ABA therapy. Insurance typically covers parent training sessions with the BCBA.",
        link: "/learn/parent-role-in-aba",
      },
      {
        question: "Is ABA therapy the same as special education?",
        answer:
          "No, ABA therapy is a clinical treatment provided by behavior analysts, while special education is educational services provided by schools. However, ABA principles can be incorporated into IEP goals, and some schools employ BCBAs to support students.",
      },
    ],
  },
  {
    id: "concerns",
    title: "Common Concerns",
    iconName: "HelpCircle" as const,
    faqs: [
      {
        question: "Is ABA therapy harmful or controversial?",
        answer:
          "Modern ABA therapy focuses on positive reinforcement, skill-building, and respecting the child's neurodiversity. Historical practices were criticized for being too rigid, but contemporary ABA is individualized, play-based, and aims to improve quality of life while respecting the child's identity.",
      },
      {
        question: "Will ABA therapy make my child 'less autistic'?",
        answer:
          "ABA therapy doesn't aim to eliminate autism or change who your child is. The goal is to help your child develop skills that improve their quality of life, communication, independence, and ability to participate in activities they enjoy.",
      },
      {
        question: "What if my child doesn't want to do ABA therapy?",
        answer:
          "Good ABA therapy should be engaging and enjoyable for children. If your child resists, discuss this with the BCBA. Treatment should incorporate your child's interests and preferences. Sometimes session length, activities, or therapist match needs adjustment.",
      },
      {
        question: "Can ABA therapy be done at school?",
        answer:
          "Yes, school-based ABA therapy is available and can support academic and social goals in the educational environment. Some schools have BCBAs on staff, or your ABA provider may coordinate with the school to provide services there.",
      },
      {
        question: "Is telehealth ABA therapy effective?",
        answer:
          "Telehealth ABA, primarily used for parent training and consultation, has proven effective especially during the pandemic. However, direct therapy with children is typically more effective in person. Many families use a hybrid approach.",
        link: "/learn/telehealth-aba-therapy",
      },
      {
        question: "When does ABA therapy end?",
        answer:
          "There's no set endpoint for ABA therapy. Some children graduate after 2-3 years when they've met major goals. Others continue longer with reduced hours. The decision is based on progress, achieving independence, and whether continued therapy provides benefit.",
      },
    ],
  },
];

// Flatten all FAQs for schema
const allFaqs = faqCategories.flatMap((cat) =>
  cat.faqs.map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }))
);

export default function FAQPage() {
  const faqSchema = generateFAQSchema(allFaqs);

  return (
    <>
      <JsonLd data={faqSchema} />

      <div className="space-y-10 pb-16">
        {/* Hero Section */}
        <section className="px-0 pt-0">
          <BubbleBackground
            interactive
            transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
            className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-8 sm:py-12"
            colors={{
              first: "255,255,255",
              second: "255,236,170",
              third: "135,176,255",
              fourth: "255,248,210",
              fifth: "190,210,255",
              sixth: "240,248,255",
            }}
          >
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <Breadcrumbs
                items={[{ label: "FAQ", href: "/faq" }]}
                className="mb-6"
              />

              <div className="flex flex-col items-center text-center">
                <Badge className="mb-4 gap-2 bg-[#FFF5C2] text-[#333333]">
                  <HelpCircle className="h-3 w-3" />
                  {allFaqs.length}+ Questions Answered
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  ABA Therapy{" "}
                  <span className="text-[#5788FF]">FAQ</span>
                </h1>
                <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                  Get expert answers to the most common questions about Applied
                  Behavior Analysis therapy, insurance coverage, finding providers,
                  and what to expect from treatment.
                </p>
              </div>
            </div>
          </BubbleBackground>
        </section>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* FAQ Search and Content */}
          <FAQSearch categories={faqCategories} />

          {/* CTA Section */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Card className="border-[#5788FF]/20 bg-[#5788FF]/[0.03]">
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                <Search className="h-8 w-8 text-[#5788FF]" />
                <div>
                  <h3 className="font-semibold">Find ABA Providers</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Search our directory of verified providers
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/search">
                    Search Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                <BookOpen className="h-8 w-8 text-emerald-600" />
                <div>
                  <h3 className="font-semibold">Read Our Guides</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    In-depth articles about ABA therapy
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/learn">
                    Browse Guides
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Still have questions */}
          <Card className="mt-8 border-dashed border-primary/50 bg-primary/[0.04]">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
              <div className="flex-1">
                <h3 className="font-semibold">Still have questions?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contact ABA therapy providers directly to get personalized
                  answers for your family&apos;s situation.
                </p>
              </div>
              <Button asChild>
                <Link href="/search">Find a Provider</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
