import { Check } from "lucide-react";

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  ctaText: string;
  highlighted?: boolean;
}

interface PricingTableProps {
  title?: string;
  subtitle?: string;
  plans?: PricingPlan[];
  isEditing?: boolean;
  onUpdate?: (properties: any) => void;
}

export const PricingTable = ({
  title = "Choose Your Plan",
  subtitle = "Select the perfect plan for your needs",
  plans = [
    {
      name: "Basic",
      price: "$9",
      period: "month",
      features: ["Feature 1", "Feature 2", "Feature 3"],
      ctaText: "Get Started",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "month",
      features: ["All Basic features", "Feature 4", "Feature 5", "Feature 6"],
      ctaText: "Get Started",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "month",
      features: ["All Pro features", "Feature 7", "Feature 8", "Priority Support"],
      ctaText: "Contact Sales",
      highlighted: false,
    },
  ],
  isEditing,
  onUpdate,
}: PricingTableProps) => {
  return (
    <div className="px-4 py-16 bg-background">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-xl text-center text-muted-foreground mb-12">{subtitle}</p>
        )}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg p-8 border-2 transition-all ${
                plan.highlighted
                  ? "border-primary shadow-lg scale-105 bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {plan.highlighted && (
                <span className="inline-block px-3 py-1 text-xs font-semibold text-primary-foreground bg-primary rounded-full mb-4">
                  Most Popular
                </span>
              )}
              <h3 className="text-2xl font-bold mb-2 text-foreground">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-foreground">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {plan.ctaText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
