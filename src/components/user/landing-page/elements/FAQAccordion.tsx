import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  title?: string;
  items?: FAQItem[];
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const FAQAccordion = ({
  title = "Frequently Asked Questions",
  items = [
    {
      question: "What is your return policy?",
      answer: "We offer a 30-day money-back guarantee for all purchases.",
    },
    {
      question: "How do I get started?",
      answer: "Simply sign up for an account and follow our onboarding guide.",
    },
    {
      question: "Do you offer customer support?",
      answer: "Yes, we provide 24/7 customer support via email and live chat.",
    },
  ],
  isEditing,
  onUpdate,
}: FAQAccordionProps) => {
  return (
    <div className="px-4 py-16 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">{title}</h2>
        <Accordion type="single" collapsible className="space-y-4">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border bg-background rounded-lg px-6"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};
